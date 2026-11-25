// Guía: Delega la restauración de una sesión persistida al repositorio.

import type { AuthRepository } from '../repositories';

export function restoreSession(repository: AuthRepository) {
  return () => repository.restoreSession();
}
