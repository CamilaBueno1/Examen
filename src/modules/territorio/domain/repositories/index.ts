/**
 * Repository interfaces for the Territorio module.
 */
import type { Provincia, Recinto, Jrv, AsignacionVeedor } from '../entities';

export interface TerritorioRepository {
  // ----- Provincia -----
  getProvincias(): Promise<Provincia[]>;
  // ----- Recinto -----
  createRecinto(recinto: Omit<Recinto, 'id'>): Promise<Recinto>;
  getRecintosByProvincia(provinciaId: string): Promise<Recinto[]>;
  // ----- JRV -----
  createJrv(jrv: Omit<Jrv, 'id'>): Promise<Jrv>;
  getJrvsByRecinto(recintoId: string): Promise<Jrv[]>;
  // ----- Asignación de veedor -----
  assignVeedor(assignment: Omit<AsignacionVeedor, 'id' | 'desde'>): Promise<AsignacionVeedor>;
  getCurrentVeedorByJrv(jrvId: string): Promise<AsignacionVeedor | null>;
}
