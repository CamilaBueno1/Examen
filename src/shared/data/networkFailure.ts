// Guía: Distingue mensajes de error de red de otros fallos de la aplicación.

export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') return false;
  return /fetch failed|failed to fetch|network request failed|unknownhostexception|unable to resolve host|networkerror|load failed/i.test(error.message);
}
