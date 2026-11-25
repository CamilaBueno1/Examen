// Guía: Describe las actas de las dos dignidades utilizadas para calcular avance.

import type { Acta } from '../../../actas/domain/entities';

interface EstadoActaVigente {
  resultadoRecibido: boolean;
  evidenciaRespaldada: boolean;
}

export type ActasVigentes = Partial<Record<Acta['dignidad'], EstadoActaVigente>>;
