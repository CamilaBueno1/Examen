/**
 * Supabase authentication adapter implementing the AuthRepository interface.
 * Uses the shared Supabase client singleton.
 * Maps Supabase Auth and the public.profile table to the domain model.
 */

import { supabase } from '@/shared/data/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { SqliteAuthDao } from '../sqlite/authDao';
import { AuthRepository } from '../../../domain/repositories';
import { User } from '../../../domain/entities';

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

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error(error.message);
    await this.local.clearUser();
  }

  async restoreSession(): Promise<User | null> {
    const [cachedUser, network] = await Promise.all([
      this.local.loadUser(),
      NetInfo.fetch(),
    ]);
    const offline = network.isConnected === false || network.isInternetReachable === false;
    const { data, error } = await supabase.auth.getSession();

    if (!data.session) {
      if (offline && cachedUser) return cachedUser;
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
      if (offline && cachedUser?.id === userId) return cachedUser;
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

  /**
   * Creates a new user using the Supabase admin endpoint.
   * A temporary password is set and the profile row is created with status 'PENDING'.
   */
  async createUser(
    user: Omit<User, 'id' | 'status'>
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
      },
    });
    if (error instanceof FunctionsHttpError) {
      if (error.context.status === 404) {
        throw new Error('No se encontró la función create-user en el proyecto configurado. Despliégala en el mismo proyecto indicado por EXPO_PUBLIC_SUPABASE_URL.');
      }
      const body: unknown = await error.context.clone().json();
      const code = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `HTTP_${error.context.status}`;
      throw new Error(`No se pudo crear el usuario: ${code}.`);
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

  /** Sign‑in with email and password, returning a populated User entity. */
  async signIn(email: string, password: string): Promise<User> {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
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

  /** Verify an OTP sent to the user's email. */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    // Supabase provides `verifyOtp` for password‑less flows. We reuse it here.
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

  /** Change the password of an existing user. */
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

  async enviarCodigoInicial(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw new Error(`No se pudo enviar el código: ${error.message}`);
  }

  async completarPrimerAcceso(userId: string, email: string, otp: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error || data.user?.id !== userId) throw new Error('El código no es válido para esta cuenta o caducó.');
    const { error: preparationError } = await supabase.rpc('preparar_primer_acceso');
    if (preparationError) throw new Error(preparationError.message);
    await this.changePassword(userId, password);
  }

  /** Trigger a password‑reset email. */
  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(`Password‑reset request failed: ${error.message}`);
    }
  }

  async resetWithCode(email: string, code: string, password: string): Promise<void> {
    const { error: verificationError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (verificationError) throw new Error('El código no es válido o caducó. Solicita un código nuevo.');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(`No se pudo guardar la contraseña: ${error.message}`);
    } finally {
      await supabase.auth.signOut({ scope: 'local' });
    }
  }

  async deactivateUser(profileId: string): Promise<void> {
    const { error } = await supabase.rpc('desactivar_cuenta', { p_perfil_id: profileId });
    if (error) throw new Error(error.message);
  }
}
