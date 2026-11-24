import { supabase } from '@/shared/data/supabaseClient';
import type { MesasRepository, OrganizacionesRepository } from '../../../domain/usecases/consultarMesas';
import type { AsignacionesRepository, RegistroAsignacion } from '../../../domain/usecases/gestionarAsignaciones';

interface MesaRow {
  jrv_id: string;
  numero: number;
  recinto_id: string;
  recinto: string;
  latitud: number | null;
  longitud: number | null;
}

export const mesasAdapter: MesasRepository & OrganizacionesRepository & AsignacionesRepository = {
  async consultar() {
    const { data, error } = await supabase.rpc('mesas_autorizadas');
    if (error) throw new Error(`No se pudieron consultar las JRV: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('El servicio no devolvió una lista de JRV.');
    return (data as MesaRow[]).map(({ jrv_id, numero, recinto_id, recinto, latitud, longitud }) => ({
      id: jrv_id, numero, recintoId: recinto_id, recinto, latitud, longitud,
    }));
  },
  async listarOrganizaciones() {
    const { data, error } = await supabase.from('organizacion').select('id, nombre').order('nombre');
    if (error) throw error;
    return data;
  },
  async historial() {
    const { data, error } = await supabase.rpc('historial_veedor_recinto');
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('El servicio no devolvió el historial.');
    return data as RegistroAsignacion[];
  },
  async asignar(mesa, veedor, razon) {
    const { error } = await supabase.rpc('asignar_veedor_recinto', { mesa, veedor, razon });
    if (error) throw new Error(error.message);
  },
};

export async function comprobarCuentaActiva(autorId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== autorId) {
    throw new Error('La sesión cambió. Vuelve a iniciar sesión para consultar el catálogo.');
  }
}
