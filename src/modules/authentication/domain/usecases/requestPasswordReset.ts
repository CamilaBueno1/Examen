// Guía: Solicita un correo de recuperación a través del repositorio.

import type { AuthRepository } from '../repositories';

/** Use‑case to request a password‑reset email. */
export const requestPasswordReset = (authRepo: AuthRepository) => {
  return async (email: string): Promise<void> => {
    return authRepo.requestPasswordReset(email);
  };
};
