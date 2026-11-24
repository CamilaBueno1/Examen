import { SqliteActaDao } from './data/adapters/sqlite/actaDao';
import { RegisterActaUseCase } from './domain/usecases/RegisterActaUseCase';
import { consultarActasLocales } from './domain/usecases/consultarActasLocales';
import { evidenciaExpo } from './data/adapters/evidenciaExpo';
import { leerEvidencia } from './domain/usecases/leerEvidencia';
import { revisarActas, type PropuestasRepository } from './domain/usecases/revisarActas';
import { revisionActasAdapter } from './data/adapters/supabase/revisionActasAdapter';

const actasLocales = new SqliteActaDao();
export const registrarActa = new RegisterActaUseCase(actasLocales);
export const listarActasLocales = consultarActasLocales(actasLocales);
export const evidenciaCaptura = leerEvidencia(evidenciaExpo);
export const revisionActas = revisarActas(revisionActasAdapter);
export const propuestasCorreccion: PropuestasRepository = actasLocales;
