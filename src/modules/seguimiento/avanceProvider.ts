// Guía: Conecta las consultas de avance y resultados con el adaptador remoto.

import { avanceAdapter } from './data/adapters/avanceAdapter';
import { consultarAvance, consultarResultados, observarCambios } from './domain/usecases/consultarAvance';

export const cargarAvance = consultarAvance(avanceAdapter);
export const cargarResultados = consultarResultados(avanceAdapter);
export const observarAvance = observarCambios(avanceAdapter);
