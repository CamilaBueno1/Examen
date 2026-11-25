import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

import type { Acta, VotoActa, Correccion } from '../../../domain/entities';
import type { ActaRepository } from '../../../domain/repositories';
import type { RegisterActaInput, RegistroActaRepository } from '../../../domain/usecases/RegisterActaUseCase';
import type { ActasLocalesRepository } from '../../../domain/usecases/consultarActasLocales';
import type { CorreccionActa, PropuestasRepository } from '../../../domain/usecases/revisarActas';

let database: Promise<SQLite.SQLiteDatabase> | undefined;

async function openActasDatabase() {
  const db = await SQLite.openDatabaseAsync('local.db');
  try {
    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS actas (
    id TEXT PRIMARY KEY NOT NULL, jrv_id TEXT NOT NULL, dignidad TEXT NOT NULL,
    version INTEGER NOT NULL, captured_at TEXT NOT NULL, lat REAL NOT NULL,
    lon REAL NOT NULL, accuracy REAL NOT NULL, foto_path TEXT NOT NULL, status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS votos_acta (
    acta_id TEXT NOT NULL, organizacion_id TEXT NOT NULL, votos INTEGER NOT NULL,
    PRIMARY KEY (acta_id, organizacion_id)
  );
  CREATE TABLE IF NOT EXISTS correcciones (
    id TEXT PRIMARY KEY NOT NULL, acta_id TEXT NOT NULL, autor_id TEXT NOT NULL,
    motivo TEXT NOT NULL, fecha TEXT NOT NULL, valores_previos TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS outbox_actas (
    operation_id TEXT PRIMARY KEY NOT NULL,
    acta_id TEXT NOT NULL,
    autor_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDING',
    intentos INTEGER NOT NULL DEFAULT 0,
    UNIQUE (acta_id)
  );
  CREATE TABLE IF NOT EXISTS propuestas_correccion (
    autor_id TEXT NOT NULL, acta_id TEXT NOT NULL, version INTEGER NOT NULL, propuesta TEXT NOT NULL,
    PRIMARY KEY (autor_id, acta_id)
  );
    `);
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

function getActasDatabase() {
  database ??= openActasDatabase().catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

export class SqliteActaDao implements ActaRepository, RegistroActaRepository, ActasLocalesRepository, PropuestasRepository {
  async guardarPropuesta(autor: string, acta: string, version: number, propuesta: CorreccionActa, pendiente = false) {
    const db = await getActasDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO propuestas_correccion (autor_id, acta_id, version, propuesta) VALUES (?, ?, ?, ?)',
      [autor, acta, version, JSON.stringify({ pendiente, propuesta })],
    );
  }

  async consultarPropuesta(autor: string, acta: string) {
    const db = await getActasDatabase();
    const row = await db.getFirstAsync<{ version: number; propuesta: string }>(
      'SELECT version, propuesta FROM propuestas_correccion WHERE autor_id = ? AND acta_id = ?', [autor, acta],
    );
    if (!row) return null;
    const datos = JSON.parse(row.propuesta) as CorreccionActa | { propuesta: CorreccionActa; pendiente: boolean | number };
    return 'propuesta' in datos
      ? { version: row.version, propuesta: datos.propuesta, pendiente: Boolean(datos.pendiente) }
      : { version: row.version, propuesta: datos, pendiente: false };
  }

  async correccionesPendientes(autor: string) {
    const db = await getActasDatabase();
    return db.getAllAsync<{ acta_id: string; version: number; propuesta: string }>(
      "SELECT acta_id, version, propuesta FROM propuestas_correccion WHERE autor_id = ? AND json_extract(propuesta, '$.pendiente') = 1",
      [autor],
    );
  }

  async resolverCorreccion(autor: string, fila: { acta_id: string; version: number; propuesta: string }, aceptada: boolean) {
    const db = await getActasDatabase();
    const filtro = [autor, fila.acta_id, fila.version, fila.propuesta];
    if (aceptada) {
      await db.runAsync('DELETE FROM propuestas_correccion WHERE autor_id = ? AND acta_id = ? AND version = ? AND propuesta = ?', filtro);
    } else {
      await db.runAsync("UPDATE propuestas_correccion SET propuesta = json_set(propuesta, '$.pendiente', 0) WHERE autor_id = ? AND acta_id = ? AND version = ? AND propuesta = ?", filtro);
    }
  }

  async borrarPropuesta(autor: string, acta: string) {
    const db = await getActasDatabase();
    await db.runAsync('DELETE FROM propuestas_correccion WHERE autor_id = ? AND acta_id = ?', [autor, acta]);
  }

  async consultarPorAutor(autorId: string) {
    const db = await getActasDatabase();
    const rows = await db.getAllAsync<{ acta_id: string; estado: string; payload: string }>(
      `SELECT o.acta_id, o.estado, o.payload
       FROM outbox_actas o JOIN actas a ON a.id = o.acta_id
       WHERE o.autor_id = ? ORDER BY a.captured_at DESC`,
      [autorId],
    );
    return rows.map((row) => ({
      id: row.acta_id, estado: row.estado, registro: JSON.parse(row.payload) as RegisterActaInput,
    }));
  }

  async guardarRegistro(input: RegisterActaInput): Promise<Acta> {
    const db = await getActasDatabase();
    const generated = await db.getFirstAsync<{ id: string }>(`
      SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
        substr(hex(randomblob(2)), 2) || '-' ||
        substr('89ab', (random() & 3) + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
        hex(randomblob(6))) AS id
    `);
    if (!generated) throw new Error('No se pudo generar el identificador del acta.');
    const { id } = generated;
    const photo = new File(Paths.document, `acta-${id}.jpg`);
    const acta: Acta = {
      id, jrvId: input.jrvId, dignidad: input.dignidad, version: 1,
      capturedAt: input.capturedAt, lat: input.lat, lon: input.lon,
      accuracy: input.accuracy, fotoPath: photo.uri, status: 'PENDING',
    };
    try {
      new File(input.fotoPath).copy(photo);
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const previous = await transaction.getFirstAsync<{ id: string }>(
          `SELECT a.id FROM actas a JOIN outbox_actas o ON o.acta_id = a.id
           WHERE o.autor_id = ? AND a.jrv_id = ? AND a.dignidad = ?`,
          [input.autorId, input.jrvId, input.dignidad],
        );
        if (previous) throw new Error('Ya guardaste un acta para esta JRV y dignidad. Revísala en Mis actas.');
        await transaction.runAsync(
          `INSERT INTO actas (id, jrv_id, dignidad, version, captured_at, lat, lon, accuracy, foto_path, status)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'PENDING')`,
          [id, acta.jrvId, acta.dignidad, acta.capturedAt, acta.lat, acta.lon, acta.accuracy, acta.fotoPath],
        );
        for (const voto of input.votos) {
          await transaction.runAsync(
            'INSERT INTO votos_acta (acta_id, organizacion_id, votos) VALUES (?, ?, ?)',
            [id, voto.organizacionId, voto.votos],
          );
        }
        const payload = JSON.stringify({ ...input, fotoPath: photo.uri, actaId: id });
        await transaction.runAsync(
          'INSERT INTO outbox_actas (operation_id, acta_id, autor_id, payload) VALUES (?, ?, ?, ?)',
          [id, id, input.autorId, payload],
        );
      });
      return acta;
    } catch (error) {
      if (photo.exists) photo.delete();
      throw error;
    }
  }

  async createActa(acta: Omit<Acta, 'id' | 'version' | 'status'>): Promise<Acta> {
    const db = await getActasDatabase();
    const id = uuidv4();
    await db.runAsync(
      `INSERT INTO actas (id, jrv_id, dignidad, version, captured_at, lat, lon, accuracy, foto_path, status)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'PENDING')`,
      [id, acta.jrvId, acta.dignidad, acta.capturedAt, acta.lat, acta.lon, acta.accuracy, acta.fotoPath],
    );
    return { id, version: 1, status: 'PENDING', ...acta };
  }

  async insertVotos(actaId: string, votos: VotoActa[]): Promise<void> {
    const db = await getActasDatabase();
    for (const voto of votos) {
      await db.runAsync(
        `INSERT OR REPLACE INTO votos_acta (acta_id, organizacion_id, votos) VALUES (?, ?, ?)`,
        [actaId, voto.organizacionId, voto.votos],
      );
    }
  }

  async findVigente(jrvId: string, dignidad: 'alcaldia' | 'prefectura'): Promise<Acta | null> {
    const db = await getActasDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM actas WHERE jrv_id = ? AND dignidad = ? AND status = 'CONFIRMED' LIMIT 1`,
      [jrvId, dignidad],
    );
    return row ? this.mapActa(row) : null;
  }

  async applyCorrection(correccion: Correccion): Promise<Acta> {
    const db = await getActasDatabase();
    await db.runAsync(
      `INSERT INTO correcciones (id, acta_id, autor_id, motivo, fecha, valores_previos) VALUES (?, ?, ?, ?, ?, ?)`,
      [correccion.id, correccion.actaId, correccion.autorId, correccion.motivo, correccion.fecha, JSON.stringify(correccion.valoresPrevios)],
    );
    const row = await db.getFirstAsync<any>(
      `UPDATE actas SET version = version + 1, status = 'PENDING' WHERE id = ? RETURNING *`,
      [correccion.actaId],
    );
    if (!row) throw new Error('El acta corregida no existe en SQLite.');
    return this.mapActa(row);
  }

  async getCorrecciones(actaId: string): Promise<Correccion[]> {
    const db = await getActasDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM correcciones WHERE acta_id = ?`, [actaId]);
    return rows.map((row) => ({
      id: row.id,
      actaId: row.acta_id,
      autorId: row.autor_id,
      motivo: row.motivo,
      fecha: row.fecha,
      valoresPrevios: JSON.parse(row.valores_previos),
    }));
  }

  private mapActa(row: any): Acta {
    return {
      id: row.id,
      jrvId: row.jrv_id,
      dignidad: row.dignidad,
      version: row.version,
      capturedAt: row.captured_at,
      lat: row.lat,
      lon: row.lon,
      accuracy: row.accuracy,
      fotoPath: row.foto_path,
      status: row.status,
    };
  }
}
