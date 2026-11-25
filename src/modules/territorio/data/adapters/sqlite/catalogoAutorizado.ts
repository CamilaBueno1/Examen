// Guía: Conserva en SQLite las mesas y candidaturas autorizadas de cada cuenta.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let connection: Promise<SQLiteDatabase> | undefined;

async function abrir() {
  const db = await openDatabaseAsync('catalogo-autorizado.db');
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS catalogo_autorizado (
        autor_id TEXT NOT NULL,
        recurso TEXT NOT NULL,
        datos TEXT NOT NULL,
        PRIMARY KEY (autor_id, recurso)
      )
    `);
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

function database() {
  connection ??= abrir().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

type RecursoCatalogo = 'mesas' | 'organizaciones';
type EntradaCatalogo<T> = { version: number | null; datos: T };

export const catalogoAutorizado = {
  async leerEntrada<T>(autorId: string, recurso: RecursoCatalogo): Promise<EntradaCatalogo<T> | null> {
    const db = await database();
    const row = await db.getFirstAsync<{ datos: string }>(
      'SELECT datos FROM catalogo_autorizado WHERE autor_id = ? AND recurso = ?',
      [autorId, recurso],
    );
    if (!row) return null;
    const value = JSON.parse(row.datos) as T | EntradaCatalogo<T>;
    if (value && typeof value === 'object' && 'version' in value && 'datos' in value) {
      return value as EntradaCatalogo<T>;
    }
    return { version: null, datos: value as T };
  },
  async leer<T>(autorId: string, recurso: RecursoCatalogo): Promise<T> {
    const entrada = await catalogoAutorizado.leerEntrada<T>(autorId, recurso);
    if (!entrada) throw new Error('Conéctate para cargar el catálogo autorizado de esta cuenta.');
    return entrada.datos;
  },
  async guardar(autorId: string, recurso: RecursoCatalogo, datos: unknown, version: number | null = null) {
    const db = await database();
    await db.runAsync(
      'INSERT OR REPLACE INTO catalogo_autorizado (autor_id, recurso, datos) VALUES (?, ?, ?)',
      [autorId, recurso, JSON.stringify({ version, datos })],
    );
  },
};
