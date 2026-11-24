import { supabase } from '@/shared/data/supabaseClient';
import type { AvanceRecinto, AvanceRepository, ResultadoCandidatura } from '../../domain/usecases/consultarAvance';

let sequence = 0;

export const avanceAdapter: AvanceRepository = {
  async consultar() {
    const { data, error } = await supabase.rpc('avance_electoral');
    if (error) throw new Error(`No se pudo consultar el avance: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('El servicio no devolvió el avance por recinto.');
    return data as AvanceRecinto[];
  },
  async resultados() {
    const { data, error } = await supabase.rpc('resultados_preliminares');
    if (error) throw new Error(`No se pudieron consultar los resultados: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('El servicio no devolvió las candidaturas.');
    return data as ResultadoCandidatura[];
  },
  observarCambios(callback) {
    const channel = supabase.channel(`avance-electoral-${++sequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cambio_electoral' }, callback)
      .subscribe((status) => { if (status === 'SUBSCRIBED') callback(); });
    return () => { void supabase.removeChannel(channel); };
  },
};
