import { SupabaseAuthAdapter } from '../data/adapters/supabase/authAdapter';
import { signInUser } from '../domain/usecases/signInUser';
import { requestPasswordReset } from '../domain/usecases/requestPasswordReset';
import { resetPassword } from '../domain/usecases/resetPassword';
import { primerAcceso } from '../domain/usecases/firstAccess';
import { restoreSession } from '../domain/usecases/restoreSession';
import { RegisterUser } from '../domain/usecases/registerUser';

const passwordRepository = new SupabaseAuthAdapter();
export const registrarUsuario = new RegisterUser(passwordRepository);
export const loginUseCase = signInUser(passwordRepository);
export const requestPasswordResetUseCase = requestPasswordReset(passwordRepository);
export const restablecerClave = resetPassword(passwordRepository);
export const flujoPrimerAcceso = primerAcceso(passwordRepository);
export const restaurarSesion = restoreSession(passwordRepository);
export const cerrarSesion = () => passwordRepository.signOut();
export const desactivarUsuario = (profileId: string) => passwordRepository.deactivateUser(profileId);
