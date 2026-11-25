// Guía: Delega la autenticación con correo y contraseña al repositorio.

import type { User } from '../entities';
import type { AuthRepository } from '../repositories';

/**
 * Domain use‑case for signing in a user.
 * It receives an {@link AuthRepository} implementation (e.g. SupabaseAuthAdapter)
 * and returns a function that performs the sign‑in operation.
 */
export const signInUser = (authRepo: AuthRepository) => {
  return async (email: string, password: string): Promise<User> => {
    return authRepo.signIn(email, password);
  };
};
