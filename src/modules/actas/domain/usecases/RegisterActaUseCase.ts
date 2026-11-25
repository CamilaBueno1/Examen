// src/modules/actas/domain/usecases/RegisterActaUseCase.ts
/**
 * Use case: register a new acta (electoral result) for a given JRV and dignidad.
 * Performs pure domain validations according to ADR‑07.
 */
import type { Acta, VotoActa } from '../entities';
import { ValidationError } from '@/shared/errors';

export interface RegisterActaInput {
  autorId: string;
  recinto: string;
  numeroJrv: number;
  recintoLat: number | null;
  recintoLon: number | null;
  jrvId: string;
  dignidad: 'alcaldia' | 'prefectura';
  capturedAt: string; // ISO datetime
  lat: number;
  lon: number;
  accuracy: number;
  fotoPath: string; // local path, later uploaded
  votos: VotoActa[]; // exactly 5 entries (one per organization)
  votosBlancos: number;
  votosNulos: number;
  totalSufragantes: number;
  calidadFoto: 'buena' | 'dudosa';
}

export interface RegistroActaRepository {
  guardarRegistro(input: RegisterActaInput): Promise<Acta>;
}

export class RegisterActaUseCase {
  constructor(private readonly actaRepo: RegistroActaRepository) {}

  async execute(input: RegisterActaInput): Promise<Acta> {
    if (!input.autorId || !input.jrvId || !input.fotoPath.trim() ||
        !Number.isFinite(Date.parse(input.capturedAt)) ||
        !Number.isFinite(input.accuracy) || input.accuracy < 0 ||
        !['alcaldia', 'prefectura'].includes(input.dignidad) ||
        !['buena', 'dudosa'].includes(input.calidadFoto)) {
      throw new ValidationError('Completa los datos del acta, la fotografía y la ubicación.');
    }
    // ----- Basic shape validation -----
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon) ||
        Math.abs(input.lat) > 90 || Math.abs(input.lon) > 180) {
      throw new ValidationError('Se requieren coordenadas válidas.');
    }
    const counts = [input.votosBlancos, input.votosNulos, input.totalSufragantes, ...input.votos.map((v) => v.votos)];
    if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) {
      throw new ValidationError('Los conteos deben ser números enteros no negativos.');
    }
    if (input.votos.length !== 5 || new Set(input.votos.map((voto) => voto.organizacionId)).size !== 5) {
      throw new ValidationError('Se requieren votos para cinco organizaciones distintas.');
    }
    // ----- Sum validation -----
    const sumOrg = input.votos.reduce((s, v) => s + v.votos, 0);
    const totalCalc = sumOrg + input.votosBlancos + input.votosNulos;
    if (totalCalc !== input.totalSufragantes) {
      throw new ValidationError('La suma de votos, blancos y nulos debe coincidir con los sufragantes.');
    }
    return this.actaRepo.guardarRegistro(input);
  }
}
