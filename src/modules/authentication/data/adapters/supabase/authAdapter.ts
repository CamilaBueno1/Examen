// Guía: Ejecuta el inicio de sesión, alta, activación y recuperación con Supabase.

/**
 * Conecta la autenticación con Supabase y convierte el perfil remoto
 * al modelo User que utiliza el dominio.
 */

import { supabase } from '@/shared/data/supabaseClient';
import { isNetworkFailure } from '@/shared/data/networkFailure';
import { FunctionsHttpError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { SqliteAuthDao } from '../sqlite/authDao';
import { AuthRepository } from '../../../domain/repositories';
import { User } from '../../../domain/entities';

const connectionRequired = 'Conéctate a internet para iniciar sesión. Para trabajar sin conexión, deja abierta una sesión ya activada y descarga tus mesas antes de desconectarte.';

async function isOffline(): Promise<boolean> {
  const network = await NetInfo.fetch().catch(() => null);
  return network?.isConnected === false || network?.isInternetReachable === false;
}

function isAuthNetworkFailure(error: { message: string }): boolean {
  return isAuthRetryableFetchError(error) || isNetworkFailure(error);
}

const accountCreationMessages: Readonly<Record<string, string>> = {
  AUTH_REQUIRED: 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.',
  PERMISO_REVOCADO: 'Tu cuenta no tiene permiso para registrar personas en la mesa o recinto seleccionado.',
  INVALID_INPUT: 'Revisa la cédula, los datos de contacto y la mesa o recinto seleccionado.',
  CEDULA_ALREADY_REGISTERED: 'Esta cédula ya está registrada. Si la persona ya es veedora, usa Asignar para gestionar sus mesas.',
  EMAIL_ALREADY_REGISTERED: 'Este correo ya pertenece a una cuenta. Revisa si la persona ya está registrada o si escribió otro correo.',
  INVALID_ACCOUNT_EMAIL: 'Supabase no aceptó este correo. Revisa que esté bien escrito.',
  ACCOUNT_CREATION_RATE_LIMITED: 'Se hicieron demasiadas solicitudes. Espera un momento y vuelve a intentar.',
  ACCOUNT_CREATION_FAILED: 'El servicio de autenticación no pudo crear la cuenta. Si el problema se repite, pide al administrador que revise los registros de Supabase.',
  PROFILE_CREATION_FAILED: 'No se pudo guardar el perfil electoral. Pide al administrador que revise el registro antes de volver a intentar.',
  ASSIGNMENT_CREATION_FAILED: 'No se pudo guardar la asignación. Revisa la disponibilidad de la mesa o recinto y vuelve a intentar.',
  JRV_OCUPADA: 'La JRV ya tiene un responsable. Recarga el formulario para confirmar un reemplazo.',
  ASIGNACION_CAMBIO: 'Cambió el responsable de la JRV. Recarga el formulario y confirma la asignación vigente.',
};

interface ProfileRow {
  cedula?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
  email?: string;
  rol?: string;
  activo?: boolean;
  estado_cuenta?: string;
}

function mapSupabaseUser(
  supabaseUser: { id: string; email?: string },
  profile: ProfileRow,
): User {
  const role = profile.rol?.toLowerCase();
  if (role !== 'provincial' && role !== 'coordinador_recinto' && role !== 'veedor') {
    throw new Error('El perfil no tiene un rol electoral válido.');
  }
  const fullName = `${profile.nombres ?? ''} ${profile.apellidos ?? ''}`.trim();
  return {
    id: supabaseUser.id,
    email: profile.email ?? supabaseUser.email ?? '',
    cedula: profile.cedula,
    firstName: profile.nombres,
    lastName: profile.apellidos,
    phone: profile.telefono ?? undefined,
    fullName,
    role: role === 'coordinador_recinto' ? 'coordinator' : role,
    status: profile.estado_cuenta === 'DISABLED'
      ? 'DISABLED'
      : profile.activo && profile.estado_cuenta === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
  };
}

export class SupabaseAuthAdapter implements AuthRepository {
  private readonly local = new SqliteAuthDao();

  // Borra el perfil local al cerrar sesión para impedir su restauración sin red.
  async signOut(): Promise<void> {
    await this.local.clearUser();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error && !isAuthNetworkFailure(error)) throw new Error(error.message);
  }

  // Con red consulta el perfil remoto. Sin red recupera el último perfil activo.
  async restoreSession(): Promise<User | null> {
    const [cachedUser, offline] = await Promise.all([
      this.local.loadUser(),
      isOffline(),
    ]);
    const activeCache = cachedUser?.status === 'ACTIVE' ? cachedUser : null;
    if (offline) return activeCache;
    const { data, error } = await supabase.auth.getSession();

    if (!data.session) {
      if (error && isAuthNetworkFailure(error)) return activeCache;
      if (error) throw new Error(`No se pudo restaurar la sesión: ${error.message}`);
      await this.local.clearUser();
      return null;
    }

    const userId = data.session.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('cedula, nombres, apellidos, telefono, email, rol, activo, estado_cuenta')
      .eq('auth_uid', userId)
      .maybeSingle();

    if (profileError) {
      if (isAuthNetworkFailure(profileError)) return activeCache?.id === userId ? activeCache : null;
      throw new Error(`No se pudo restaurar el perfil electoral: ${profileError.message}`);
    }
    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' });
      await this.local.clearUser();
      return null;
    }

    const user = mapSupabaseUser(data.session.user, profile);
    if (user.status === 'DISABLED') {
      await supabase.auth.signOut({ scope: 'local' });
      await this.local.clearUser();
      return null;
    }
    await this.local.saveUser(user);
    return user;
  }

  // La función del servidor crea el perfil pendiente y entrega la clave temporal.
  async createUser(
    user: Omit<User, 'id' | 'status'>,
    asignacionEsperada?: string,
  ): Promise<{ user: User; temporaryPassword: string }> {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: user.email,
        cedula: user.cedula,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        jurisdictionId: user.jurisdictionId,
        asignacionEsperada,
      },
    });
    if (error instanceof FunctionsHttpError) {
      if (error.context.status === 404) {
        throw new Error('No se encontró la función create-user en el proyecto configurado. Despliégala en el mismo proyecto indicado por EXPO_PUBLIC_SUPABASE_URL.');
      }
      const body: unknown = await error.context.clone().json().catch(() => null);
      const code = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `HTTP_${error.context.status}`;
      throw new Error(
        accountCreationMessages[code] ??
          (error.context.status === 401
            ? accountCreationMessages.AUTH_REQUIRED
            : 'El servicio no pudo completar el registro. Intenta de nuevo y avisa al administrador si el problema continúa.'),
      );
    }
    if (error) throw new Error(`No se pudo crear el usuario: ${error.message}`);
    if (!data?.user) throw new Error('La operación remota no devolvió el usuario creado.');
    if (typeof data.temporaryPassword !== 'string' || data.temporaryPassword.length < 8) {
      throw new Error('La operación remota no devolvió una clave temporal válida.');
    }
    return {
      user: mapSupabaseUser(data.user, data.profile as ProfileRow),
      temporaryPassword: data.temporaryPassword,
    };
  }

  // Autentica las credenciales y descarga el perfil electoral de esa cuenta.
  async signIn(email: string, password: string): Promise<User> {
    if (await isOffline()) throw new Error(connectionRequired);
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      if (isAuthNetworkFailure(signInError)) throw new Error(connectionRequired);
      throw new Error(`Sign‑in failed: ${signInError.message}`);
    }
    const userId = signInData?.user?.id;
    if (!userId) {
      throw new Error('Supabase sign‑in did not return a user id');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('cedula, nombres, apellidos, telefono, email, rol, activo, estado_cuenta')
      .eq('auth_uid', userId)
      .maybeSingle();
    if (profileError) {
      await supabase.auth.signOut({ scope: 'local' });
      if (isAuthNetworkFailure(profileError)) throw new Error(connectionRequired);
      if (profileError.code === '42501' || profileError.message.toLowerCase().includes('permission denied')) {
        throw new Error('Supabase bloqueó la lectura del perfil. Verifica que la migración de RLS esté aplicada y que la política permita leer solo el perfil propio.');
      }
      throw new Error(`No se pudo consultar el perfil electoral: ${profileError.message}`);
    }
    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('La contraseña fue aceptada, pero esta cuenta no tiene un perfil electoral vinculado. El administrador debe crear en public.profile una fila con auth_uid igual al ID de esta cuenta, además de cédula, nombres, apellidos y rol. No crees un perfil con otro usuario ni asignes un rol por defecto.');
    }
    const user = mapSupabaseUser(signInData.user, profile);
    if (user.status === 'DISABLED') {
      await supabase.auth.signOut({ scope: 'local' });
      await this.local.clearUser();
      throw new Error('Esta cuenta fue desactivada. Contacta al coordinador de tu ámbito.');
    }
    await this.local.saveUser(user);
    return user;
  }

  // Comprueba el código de un solo uso enviado al correo.
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token: otp,
    });
    if (error) {
      console.warn('OTP verification failed:', error.message);
      return false;
    }
    return true;
  }

  // Cambia la clave y solicita al servidor activar el perfil.
  async changePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
    const { error: activationError } = await supabase.rpc('activar_perfil_primer_acceso');
    if (activationError) {
      throw new Error(`La contraseña cambió, pero el perfil no pudo activarse: ${activationError.message}`);
    }
  }

  // Solicita un código para una cuenta que ya fue creada por un coordinador.
  async enviarCodigoInicial(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw new Error(`No se pudo enviar el código: ${error.message}`);
  }

  // Verifica el código y la identidad antes de permitir el cambio de clave.
  async completarPrimerAcceso(userId: string, email: string, otp: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error || data.user?.id !== userId) throw new Error('El código no es válido para esta cuenta o caducó.');
    const { error: preparationError } = await supabase.rpc('preparar_primer_acceso');
    if (preparationError) throw new Error(preparationError.message);
    await this.changePassword(userId, password);
  }

  // Solicita el correo con el código de recuperación.
  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(`Password‑reset request failed: ${error.message}`);
    }
  }

  // Recuperación: verifica el código, cambia la clave y cierra la sesión temporal.
  async resetWithCode(email: string, code: string, password: string): Promise<void> {
    const { error: verificationError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (verificationError) throw new Error('El código no es válido o caducó. Solicita un código nuevo.');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(`No se pudo guardar la contraseña: ${error.message}`);
    } finally {
      await this.signOut();
    }
  }

  async deactivateUser(profileId: string): Promise<void> {
    const { error } = await supabase.rpc('desactivar_cuenta', { p_perfil_id: profileId });
    if (error) throw new Error(error.message);
  }
}
