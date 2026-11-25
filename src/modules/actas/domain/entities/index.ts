// Guía: Define las estructuras de actas, votos y correcciones en el dominio.

/**
 * Domain entities for the Actas module.
 */
export interface Acta {
  id: string; // UUID
  jrvId: string;
  dignidad: 'alcaldia' | 'prefectura';
  version: number; // incremented on each correction
  capturedAt: string; // ISO datetime
  lat: number;
  lon: number;
  accuracy: number;
  fotoPath: string; // referencia al Storage bucket
  status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'REJECTED';
}

export interface VotoActa {
  actaId: string;
  organizacionId: string;
  votos: number; // >= 0
}

export interface Correccion {
  id: string; // UUID
  actaId: string;
  autorId: string;
  motivo: string;
  fecha: string; // ISO
  valoresPrevios: any; // snapshot de la acta antes de la corrección
  expectedVersion?: number;
}
