import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

import type { Provincia, Recinto, Jrv, AsignacionVeedor } from '../../../domain/entities';
import type { TerritorioRepository } from '../../../domain/repositories';

const db = SQLite.openDatabaseSync('local.db');
db.execSync(`
  CREATE TABLE IF NOT EXISTS provincias (id TEXT PRIMARY KEY, nombre TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS recintos (
    id TEXT PRIMARY KEY, provincia_id TEXT NOT NULL, canton TEXT NOT NULL,
    parroquia TEXT NOT NULL, nombre TEXT NOT NULL, lat REAL, lon REAL
  );
  CREATE TABLE IF NOT EXISTS jrvs (id TEXT PRIMARY KEY, recinto_id TEXT NOT NULL, numero INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS asignaciones_veedor (
    id TEXT PRIMARY KEY, jrv_id TEXT NOT NULL, veedor_id TEXT NOT NULL,
    desde TEXT NOT NULL, hasta TEXT, motivo TEXT, asignado_por TEXT NOT NULL
  );
`);

export class SqliteTerritorioDao implements TerritorioRepository {
  async getProvincias(): Promise<Provincia[]> {
    return db.getAllSync<any>(`SELECT * FROM provincias`).map((row) => ({ id: row.id, nombre: row.nombre }));
  }
  async createRecinto(recinto: Omit<Recinto, 'id'>): Promise<Recinto> {
    const id = uuidv4();
    db.runSync(`INSERT INTO recintos (id, provincia_id, canton, parroquia, nombre, lat, lon) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, recinto.provinciaId, recinto.canton, recinto.parroquia, recinto.nombre, recinto.lat ?? null, recinto.lon ?? null]);
    return { id, ...recinto };
  }
  async getRecintosByProvincia(provinciaId: string): Promise<Recinto[]> {
    return db.getAllSync<any>(`SELECT * FROM recintos WHERE provincia_id = ?`, [provinciaId]).map((row) => ({
      id: row.id, provinciaId: row.provincia_id, canton: row.canton, parroquia: row.parroquia,
      nombre: row.nombre, lat: row.lat ?? undefined, lon: row.lon ?? undefined,
    }));
  }
  async createJrv(jrv: Omit<Jrv, 'id'>): Promise<Jrv> {
    const id = uuidv4();
    db.runSync(`INSERT INTO jrvs (id, recinto_id, numero) VALUES (?, ?, ?)`, [id, jrv.recintoId, jrv.numero]);
    return { id, ...jrv };
  }
  async getJrvsByRecinto(recintoId: string): Promise<Jrv[]> {
    return db.getAllSync<any>(`SELECT * FROM jrvs WHERE recinto_id = ?`, [recintoId]).map((row) => ({
      id: row.id, recintoId: row.recinto_id, numero: row.numero,
    }));
  }
  async assignVeedor(assignment: Omit<AsignacionVeedor, 'id' | 'desde'>): Promise<AsignacionVeedor> {
    const now = new Date().toISOString();
    db.runSync(`UPDATE asignaciones_veedor SET hasta = ? WHERE jrv_id = ? AND hasta IS NULL`, [now, assignment.jrvId]);
    const id = uuidv4();
    db.runSync(`INSERT INTO asignaciones_veedor (id, jrv_id, veedor_id, desde, hasta, motivo, asignado_por) VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      [id, assignment.jrvId, assignment.veedorId, now, assignment.motivo ?? null, assignment.asignadoPor]);
    return { id, ...assignment, desde: now };
  }
  async getCurrentVeedorByJrv(jrvId: string): Promise<AsignacionVeedor | null> {
    const row = db.getFirstSync<any>(`SELECT * FROM asignaciones_veedor WHERE jrv_id = ? AND hasta IS NULL LIMIT 1`, [jrvId]);
    return row ? {
      id: row.id, jrvId: row.jrv_id, veedorId: row.veedor_id, desde: row.desde,
      hasta: row.hasta ?? undefined, motivo: row.motivo ?? undefined, asignadoPor: row.asignado_por,
    } : null;
  }
}
