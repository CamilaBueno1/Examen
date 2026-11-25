// Guía: Consulta actas e historial y envía correcciones o validaciones de evidencia a Supabase.

import { supabase } from '@/shared/data/supabaseClient';
import type { ActaRemota, RevisionActasRepository, RevisionAnterior } from '../../../domain/usecases/revisarActas';

export const revisionActasAdapter: RevisionActasRepository = {
  async listar() {
    const { data, error } = await supabase.rpc('actas_vigentes_autorizadas');
    if (error || !Array.isArray(data)) throw new Error(error?.message ?? 'No se pudieron listar las actas.');
    return data as ActaRemota[];
  },
  async historial(id) {
    const { data, error } = await supabase.rpc('historial_acta_autorizada', { acta: id });
    if (error || !Array.isArray(data)) throw new Error(error?.message ?? 'No se pudo consultar el historial.');
    return data as RevisionAnterior[];
  },
  async foto(ruta) {
    const { data, error } = await supabase.storage.from('actas-privadas').createSignedUrl(ruta, 120);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
  async validarEvidencia(foto) {
    const { error } = await supabase.rpc('validar_evidencia_recinto', { foto });
    if (error) throw new Error(error.message);
  },
  async corregir(acta, expected_version, { motivo, ...datos }) {
    const { data, error } = await supabase.rpc('corregir_acta', { acta, expected_version, razon: motivo, datos });
    if (error || typeof data !== 'number') throw new Error(error?.message ?? 'No se pudo confirmar la corrección.');
    return data;
  },
};
