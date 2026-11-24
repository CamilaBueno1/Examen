import type { Acta } from '../../../actas/domain/entities';

interface EstadoActaVigente {
  resultadoRecibido: boolean;
  evidenciaRespaldada: boolean;
}

export type ActasVigentes = Partial<Record<Acta['dignidad'], EstadoActaVigente>>;
