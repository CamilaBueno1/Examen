// Guía: Describe provincias, recintos, mesas y asignaciones del dominio territorial.

/**
 * Domain entities for the Territorio module.
 */
export interface Provincia {
  id: string;
  nombre: string;
}

export interface Recinto {
  id: string;
  provinciaId: string;
  canton: string;
  parroquia: string;
  nombre: string;
  lat?: number;
  lon?: number;
}

export interface Jrv {
  id: string;
  recintoId: string;
  numero: number;
}

export interface AsignacionVeedor {
  id: string; // UUID
  jrvId: string;
  veedorId: string;
  desde: string; // ISO datetime
  hasta?: string; // null while vigente
  motivo?: string;
  asignadoPor: string; // userId
}
