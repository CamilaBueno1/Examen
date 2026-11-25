// Guía: Ensambla los casos de uso con NetInfo, la cola SQLite y Supabase.

import { connectivityRepository } from './data/repositories/connectivityRepository';
import { observeConnectivity } from './domain/usecases/observeConnectivity';
import { colaActasSqlite } from './data/adapters/colaActasSqlite';
import { recepcionActasSupabase } from './data/adapters/recepcionActasSupabase';
import { enviarPendientes } from './domain/usecases/enviarPendientes';

export const observeNetwork = observeConnectivity(connectivityRepository);
export const sincronizarActas = enviarPendientes(colaActasSqlite, recepcionActasSupabase);
