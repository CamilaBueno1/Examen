// Guía: Organiza la solicitud de código y la activación de una cuenta nueva.

export interface FirstAccessRepository {
  enviarCodigoInicial(email: string): Promise<void>;
  completarPrimerAcceso(userId: string, email: string, otp: string, password: string): Promise<void>;
}

export function primerAcceso(repository: FirstAccessRepository) {
  return {
    enviar: (email: string) => repository.enviarCodigoInicial(email),
    completar: (userId: string, email: string, otp: string, password: string) =>
      repository.completarPrimerAcceso(userId, email, otp, password),
  };
}
