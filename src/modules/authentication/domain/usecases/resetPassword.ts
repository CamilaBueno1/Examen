// Guía: Pasa el correo, el código y la nueva clave al repositorio de recuperación.

export interface PasswordRecoveryRepository {
  resetWithCode(email: string, code: string, password: string): Promise<void>;
}

export function resetPassword(repository: PasswordRecoveryRepository) {
  return (email: string, code: string, password: string) =>
    repository.resetWithCode(email, code, password);
}
