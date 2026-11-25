// Guía: Define errores de validación que los casos de uso pueden comunicar.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
