import type { AuthRepository } from '../repositories';

export function restoreSession(repository: AuthRepository) {
  return () => repository.restoreSession();
}
