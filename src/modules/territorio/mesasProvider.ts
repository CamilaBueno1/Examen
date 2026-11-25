// Guía: Combina las consultas remotas con el catálogo versionado del teléfono.

import { isNetworkFailure } from '@/shared/data/networkFailure';
import { comprobarCuentaActiva, consultarVersionCatalogo, mesasAdapter } from './data/adapters/supabase/mesasAdapter';
import { catalogoAutorizado } from './data/adapters/sqlite/catalogoAutorizado';
import { consultarMesas, consultarOrganizaciones } from './domain/usecases/consultarMesas';
import { gestionarAsignaciones } from './domain/usecases/gestionarAsignaciones';

// Usa la copia por usuario sin red y comprueba la versión cuando hay conexión.
function conCatalogoLocal<T>(
  recurso: 'mesas' | 'organizaciones',
  consultar: () => Promise<T>,
  consultarVersion?: () => Promise<number | null>,
) {
  return async (autorId: string, sinConexion: boolean): Promise<T> => {
    if (sinConexion) return catalogoAutorizado.leer<T>(autorId, recurso);
    let data: T;
    let version: number | null = null;
    try {
      await comprobarCuentaActiva(autorId);
      if (consultarVersion) {
        version = await consultarVersion();
        if (version !== null) {
          const local = await catalogoAutorizado.leerEntrada<T>(autorId, recurso);
          if (local?.version === version) {
            await comprobarCuentaActiva(autorId);
            return local.datos;
          }
        }
      }
      data = await consultar();
      await comprobarCuentaActiva(autorId);
    } catch (error) {
      if (isNetworkFailure(error)) return catalogoAutorizado.leer<T>(autorId, recurso);
      throw error;
    }
    await catalogoAutorizado.guardar(autorId, recurso, data, version);
    return data;
  };
}

export const cargarMesasAutorizadas = conCatalogoLocal('mesas', consultarMesas(mesasAdapter));
export const cargarOrganizaciones = conCatalogoLocal(
  'organizaciones',
  consultarOrganizaciones(mesasAdapter),
  consultarVersionCatalogo,
);

// Precarga mesas y candidaturas para que el formulario pueda abrir sin señal.
export async function cargarCatalogoVeedor(autorId: string, sinConexion: boolean) {
  const [mesas] = await Promise.all([
    cargarMesasAutorizadas(autorId, sinConexion),
    cargarOrganizaciones(autorId, sinConexion),
  ]);
  return mesas;
}

export const asignaciones = gestionarAsignaciones(mesasAdapter);
