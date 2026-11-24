import { colaActasSqlite } from './data/adapters/colaActasSqlite';
import { recepcionActasSupabase } from './data/adapters/recepcionActasSupabase';
import { enviarPendientes } from './domain/usecases/enviarPendientes';

export const sincronizarActas = enviarPendientes(colaActasSqlite, recepcionActasSupabase);
