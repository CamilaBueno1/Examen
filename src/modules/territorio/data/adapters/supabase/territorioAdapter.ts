/**
 * Supabase territorio adapter implementing the TerritorioRepository interface.
 * Uses the shared Supabase client singleton.
 */

import { supabase } from '@/shared/data/supabaseClient';
import { TerritorioRepository } from '../../../domain/repositories';
import { Provincia, Recinto, Jrv, AsignacionVeedor } from '../../../domain/entities';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseTerritorioAdapter implements TerritorioRepository {
  /** Fetch all provinces */
  async getProvincias(): Promise<Provincia[]> {
    const { data, error } = await supabase.from('provincias').select('*');
    if (error) {
      throw new Error(`Failed to fetch provincias: ${error.message}`);
    }
    return data as Provincia[];
  }

  /** Create a new recinto (district) */
  async createRecinto(recinto: Omit<Recinto, 'id'>): Promise<Recinto> {
    const id = uuidv4();
    const { error } = await supabase.from('recintos').insert({
      id,
      ...recinto,
    });
    if (error) {
      throw new Error(`Failed to create recinto: ${error.message}`);
    }
    return { id, ...recinto } as Recinto;
  }

  /** Get recintos belonging to a province */
  async getRecintosByProvincia(provinciaId: string): Promise<Recinto[]> {
    const { data, error } = await supabase
      .from('recintos')
      .select('*')
      .eq('provincia_id', provinciaId);
    if (error) {
      throw new Error(`Failed to fetch recintos: ${error.message}`);
    }
    return data as Recinto[];
  }

  /** Create a new JRV */
  async createJrv(jrv: Omit<Jrv, 'id'>): Promise<Jrv> {
    const id = uuidv4();
    const { error } = await supabase.from('jrvs').insert({
      id,
      ...jrv,
    });
    if (error) {
      throw new Error(`Failed to create JRV: ${error.message}`);
    }
    return { id, ...jrv } as Jrv;
  }

  /** Get JRVs for a given recinto */
  async getJrvsByRecinto(recintoId: string): Promise<Jrv[]> {
    const { data, error } = await supabase
      .from('jrvs')
      .select('*')
      .eq('recinto_id', recintoId);
    if (error) {
      throw new Error(`Failed to fetch JRVs: ${error.message}`);
    }
    return data as Jrv[];
  }

  /** Assign a veedor to a JRV, closing any previous active assignment */
  async assignVeedor(assignment: Omit<AsignacionVeedor, 'id' | 'desde'>): Promise<AsignacionVeedor> {
    const now = new Date().toISOString();
    // Close previous active assignment for this JRV, if any
    await supabase
      .from('asignaciones_veedor')
      .update({ hasta: now })
      .eq('jrv_id', assignment.jrvId)
      .is('hasta', null);

    const id = uuidv4();
    const newAssign: AsignacionVeedor = {
      id,
      ...assignment,
      desde: now,
    };
    const { error } = await supabase.from('asignaciones_veedor').insert(newAssign);
    if (error) {
      throw new Error(`Failed to assign veedor: ${error.message}`);
    }
    return newAssign;
  }

  /** Get the currently active veedor assignment for a JRV */
  async getCurrentVeedorByJrv(jrvId: string): Promise<AsignacionVeedor | null> {
    const { data, error } = await supabase
      .from('asignaciones_veedor')
      .select('*')
      .eq('jrv_id', jrvId)
      .is('hasta', null)
      .single();
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw new Error(`Failed to fetch current veedor: ${error.message}`);
    }
    return data ? (data as AsignacionVeedor) : null;
  }
}
