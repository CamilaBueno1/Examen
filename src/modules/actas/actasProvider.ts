import { SqliteActaDao } from './data/adapters/sqlite/actaDao';
import { RegisterActaUseCase } from './domain/usecases/RegisterActaUseCase';
import { consultarActasLocales } from './domain/usecases/consultarActasLocales';
import { evidenciaExpo } from './data/adapters/evidenciaExpo';
import { leerEvidencia } from './domain/usecases/leerEvidencia';
import { revisarActas, type CorreccionActa, type PropuestasRepository } from './domain/usecases/revisarActas';
import { revisionActasAdapter } from './data/adapters/supabase/revisionActasAdapter';
import { revisionActasCache } from './data/adapters/sqlite/revisionActasCache';
import { comprobarCuentaActiva } from '@/modules/territorio/data/adapters/supabase/mesasAdapter';
import { isNetworkFailure } from '@/shared/data/networkFailure';

const actasLocales = new SqliteActaDao();
export const registrarActa = new RegisterActaUseCase(actasLocales);
export const listarActasLocales = consultarActasLocales(actasLocales);
export const evidenciaCaptura = leerEvidencia(evidenciaExpo);
export const revisionActas = revisarActas(revisionActasAdapter);
export const propuestasCorreccion: PropuestasRepository = actasLocales;

export async function sincronizarCorrecciones(autor: string, vigente: () => boolean, alActualizar: () => void) {
  for (const fila of await actasLocales.correccionesPendientes(autor)) {
    if (!vigente()) return;
    await comprobarCuentaActiva(autor);
    if (!vigente()) return;
    const { propuesta } = JSON.parse(fila.propuesta) as { propuesta: CorreccionActa };
    try {
      await revisionActas.corregir({ id: fila.acta_id, version: fila.version }, propuesta);
      await actasLocales.resolverCorreccion(autor, fila, true);
    } catch (error) {
      if (isNetworkFailure(error)) return;
      if (!(error instanceof Error) || !/CONFLICTO_VERSION|PERMISO_REVOCADO|VOTOS_INVALIDOS/.test(error.message)) throw error;
      await actasLocales.resolverCorreccion(autor, fila, false);
    }
    alActualizar();
  }
}

const descargasFotos = new Map<string, Promise<string | undefined>>();

function descargarFoto(id: string, cuenta: string, fotoId: string, ruta: string) {
  const key = JSON.stringify([cuenta, fotoId]);
  const existente = descargasFotos.get(key);
  if (existente) return existente;
  const tarea = (async () => {
    const local = revisionActasCache.foto(cuenta, fotoId);
    if (local) return local;
    await comprobarCuentaActiva(id);
    const url = await revisionActas.foto(ruta);
    await comprobarCuentaActiva(id);
    return revisionActasCache.guardarFoto(cuenta, fotoId, url);
  })().finally(() => descargasFotos.delete(key));
  descargasFotos.set(key, tarea);
  return tarea;
}

export const consultaRevisionLocal = {
  leer: revisionActasCache.leer,
  foto: revisionActasCache.foto,
  descargarFoto,
  async actualizar(id: string, cuenta: string) {
    await comprobarCuentaActiva(id);
    const actas = await revisionActas.listar();
    await comprobarCuentaActiva(id);
    await revisionActasCache.guardar(cuenta, actas);
    return actas;
  },
  async respaldarFotos(id: string, cuenta: string, actas: Awaited<ReturnType<typeof revisionActas.listar>>, vigente: () => boolean) {
    for (const { foto_id, storage_path } of actas) {
      if (!vigente()) return;
      if (!foto_id || !storage_path || revisionActasCache.foto(cuenta, foto_id)) continue;
      try {
        await descargarFoto(id, cuenta, foto_id, storage_path);
      } catch {
        // El acta sigue disponible, incluso cuando no se pudo descargar su fotografía.
      }
    }
  },
};
