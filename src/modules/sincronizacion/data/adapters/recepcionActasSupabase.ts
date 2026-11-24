import { File } from 'expo-file-system';
import { supabase } from '@/shared/data/supabaseClient';
import type { RecepcionActas } from '../../domain/usecases/enviarPendientes';

async function comprobarAutor(autorId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== autorId) throw new Error('La sesión cambió.');
}

export const recepcionActasSupabase: RecepcionActas = {
  async recibir(operacion) {
    await comprobarAutor(operacion.autorId);
    const { jrvId, dignidad, votos, votosBlancos, votosNulos, totalSufragantes,
      capturedAt, lat, lon, accuracy, calidadFoto } = operacion.datos;
    const datos = { jrvId, dignidad, votos, votosBlancos, votosNulos, totalSufragantes,
      capturedAt, lat, lon, accuracy, calidadFoto };
    const { data, error } = await supabase.rpc('recibir_acta', { operacion: operacion.id, datos });
    if (error) throw new Error(error.message);
    if (typeof data !== 'string') throw new Error('El servidor no devolvió el ID del acta.');
    return data;
  },
  async evidencia(operacion, actaId) {
    await comprobarAutor(operacion.autorId);
    const confirmar = () => supabase.rpc('registrar_evidencia', { operacion: operacion.id });
    const anterior = await confirmar();
    if (!anterior.error && typeof anterior.data === 'string') return anterior.data;
    if (!anterior.error?.message.includes('EVIDENCIA_PENDIENTE')) {
      throw new Error(anterior.error?.message ?? 'No se pudo verificar la fotografía.');
    }
    const file = new File(operacion.datos.fotoPath);
    if (!file.exists) throw new Error('FOTO_NO_DISPONIBLE');
    const bytes = Uint8Array.from(await file.bytes()).buffer;
    await comprobarAutor(operacion.autorId);
    const { error: uploadError } = await supabase.storage.from('actas-privadas').upload(
      `${operacion.autorId}/${actaId}.jpg`, bytes, { contentType: 'image/jpeg', upsert: false },
    );
    const resultado = await confirmar();
    if (resultado.error || typeof resultado.data !== 'string') {
      throw new Error(resultado.error?.message ?? uploadError?.message ?? 'No se pudo registrar la evidencia.');
    }
    return resultado.data;
  },
};
