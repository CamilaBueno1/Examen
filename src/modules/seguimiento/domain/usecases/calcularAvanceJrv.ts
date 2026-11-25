// Guía: Distingue una JRV reportada de una JRV con las dos evidencias respaldadas.

import type { ActasVigentes } from '../entities/actasVigentes';

export function calcularAvanceJrv({ alcaldia, prefectura }: ActasVigentes) {
  const reportada = alcaldia?.resultadoRecibido === true &&
    prefectura?.resultadoRecibido === true;
  const respaldada = reportada &&
    alcaldia?.evidenciaRespaldada === true &&
    prefectura?.evidenciaRespaldada === true;

  return { reportada, respaldada };
}
