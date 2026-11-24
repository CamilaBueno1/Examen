// src/modules/actas/data/adapters/supabase/actaAdapter.ts
/**
 * Supabase adapter for Acta repository.
 * Implements create, insertVotos, findVigente, applyCorrection and getCorrecciones.
 * Uses optimistic versioning (expected_version) – if the version sent by the client
 * does not match the current version in DB the trigger will raise an error that we
 * translate to CONFLICTO_VERSION.
 */
import { supabase } from '@/shared/data/supabaseClient';
import type { Acta, VotoActa, Correccion } from '../../../domain/entities';
import type { ActaRepository } from '../../../domain/repositories';

export class SupabaseActaAdapter implements ActaRepository {
  async createActa(acta: Omit<Acta, 'id' | 'version' | 'status'>): Promise<Acta> {
    const { data, error } = await supabase.from('acta').insert({
      ...acta,
      version: 1,
      status: 'PENDING',
    }).single();
    if (error) throw new Error(error.message);
    return data as Acta;
  }

  async insertVotos(actaId: string, votos: VotoActa[]): Promise<void> {
    const inserts = votos.map(v => ({
      acta_id: actaId,
      organizacion_id: v.organizacionId,
      votos: v.votos,
    }));
    const { error } = await supabase.from('votos_acta').insert(inserts);
    if (error) throw new Error(error.message);
  }

  async findVigente(jrvId: string, dignidad: 'alcaldia' | 'prefectura'): Promise<Acta | null> {
    const { data, error } = await supabase
      .from('acta')
      .select('*')
      .eq('jrv_id', jrvId)
      .eq('dignidad', dignidad)
      .eq('status', 'CONFIRMED') // only confirmed acts are considered vigente
      .order('version', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') { // No rows returns code 116
      throw new Error(error.message);
    }
    return data ? (data as Acta) : null;
  }

  async applyCorrection(correccion: Correccion): Promise<Acta> {
    const { data, error } = await supabase.rpc('aplicar_correccion', {
      acta_id: correccion.actaId,
      autor_id: correccion.autorId,
      motivo: correccion.motivo,
      valores_previos: correccion.valoresPrevios,
      expected_version: correccion.expectedVersion,
    });
    if (error) {
      if (error.message.includes('CONFLICTO_VERSION')) {
        throw new Error('CONFLICTO_VERSION');
      }
      throw new Error(error.message);
    }
    return data as Acta;
  }

  async getCorrecciones(actaId: string): Promise<Correccion[]> {
    const { data, error } = await supabase
      .from('correcciones')
      .select('*')
      .eq('acta_id', actaId)
      .order('fecha', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Correccion[];
  }
}
