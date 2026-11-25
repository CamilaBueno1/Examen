// Guía: Consulta y registra recintos y mesas con las operaciones del servidor.

import { supabase } from '@/shared/data/supabaseClient';
import type { RecintosRepository, CrearRecintoInput } from '../../../domain/usecases/gestionarRecintos';

export const recintosAdapter: RecintosRepository = {
  async crear(input: CrearRecintoInput) {
    const { data, error } = await supabase.rpc('registrar_recinto', {
      nombre: input.nombre,
      parroquia: input.parroquia,
      numero_jrv: input.numeroJrv,
    });
    if (error) throw new Error(`No se pudo crear el recinto: ${error.message}`);
    if (typeof data !== 'string') throw new Error('El servicio no confirmó el recinto creado.');
    return data;
  },
};
