/**
 * Repository interfaces for the Actas module.
 */
import type { Acta, VotoActa, Correccion } from '../entities';

export interface ActaRepository {
  /** Crear una acta (versión 1) */
  createActa(acta: Omit<Acta, 'id' | 'version' | 'status'>): Promise<Acta>;

  /** Insertar los votos asociados a la acta */
  insertVotos(actaId: string, votos: VotoActa[]): Promise<void>;

  /** Buscar una acta vigente para jrvId + dignidad */
  findVigente(jrvId: string, dignidad: 'alcaldia' | 'prefectura'): Promise<Acta | null>;

  /** Aplicar una corrección (versión ++) */
  applyCorrection(correccion: Correccion): Promise<Acta>;

  /** Obtener historial de correcciones */
  getCorrecciones(actaId: string): Promise<Correccion[]>;
}
