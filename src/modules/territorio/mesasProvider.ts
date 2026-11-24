import { comprobarCuentaActiva, mesasAdapter } from './data/adapters/supabase/mesasAdapter';
import { catalogoAutorizado } from './data/adapters/sqlite/catalogoAutorizado';
import { consultarMesas, consultarOrganizaciones } from './domain/usecases/consultarMesas';
import { gestionarAsignaciones } from './domain/usecases/gestionarAsignaciones';

function conCatalogoLocal<T>(recurso: 'mesas' | 'organizaciones', consultar: () => Promise<T>) {
  return async (autorId: string, sinConexion: boolean): Promise<T> => {
    if (sinConexion) return catalogoAutorizado.leer<T>(autorId, recurso);
    await comprobarCuentaActiva(autorId);
    const data = await consultar();
    await comprobarCuentaActiva(autorId);
    await catalogoAutorizado.guardar(autorId, recurso, data);
    return data;
  };
}

export const cargarMesasAutorizadas = conCatalogoLocal('mesas', consultarMesas(mesasAdapter));
export const cargarOrganizaciones = conCatalogoLocal('organizaciones', consultarOrganizaciones(mesasAdapter));
export const asignaciones = gestionarAsignaciones(mesasAdapter);
