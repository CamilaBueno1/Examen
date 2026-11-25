// Guía: Conecta las reglas de autenticación con el adaptador de Supabase.

// Punto de composición del módulo de autenticación (ADR-01).
// Igual que actasProvider.ts y mesasProvider.ts: aquí, y solo aquí, se conecta
// la implementación de data (SupabaseAuthAdapter) con los casos de uso de domain.
// Presentation consume estas instancias ya configuradas.
import { SupabaseAuthAdapter } from './data/adapters/supabase/authAdapter';
import { signInUser } from './domain/usecases/signInUser';
import { requestPasswordReset } from './domain/usecases/requestPasswordReset';
import { resetPassword } from './domain/usecases/resetPassword';
import { primerAcceso } from './domain/usecases/firstAccess';
import { restoreSession } from './domain/usecases/restoreSession';
import { RegisterUser } from './domain/usecases/registerUser';

const authRepository = new SupabaseAuthAdapter();

export const registrarUsuario = new RegisterUser(authRepository);
export const loginUseCase = signInUser(authRepository);
export const requestPasswordResetUseCase = requestPasswordReset(authRepository);
export const restablecerClave = resetPassword(authRepository);
export const flujoPrimerAcceso = primerAcceso(authRepository);
export const restaurarSesion = restoreSession(authRepository);
export const cerrarSesion = () => authRepository.signOut();
export const desactivarUsuario = (profileId: string) => authRepository.deactivateUser(profileId);
