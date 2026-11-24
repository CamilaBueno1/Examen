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

export const catalogoAutorizado = {
  async leer<T>(autorId: string, recurso: 'mesas' | 'organizaciones'): Promise<T> {
    const db = await database();
    const row = await db.getFirstAsync<{ datos: string }>(
      'SELECT datos FROM catalogo_autorizado WHERE autor_id = ? AND recurso = ?',
      [autorId, recurso],
    );
    if (!row) throw new Error('Conéctate para cargar el catálogo autorizado de esta cuenta.');
    return JSON.parse(row.datos) as T;
  },
  async guardar(autorId: string, recurso: 'mesas' | 'organizaciones', datos: unknown) {
    const db = await database();
    await db.runAsync(
      'INSERT OR REPLACE INTO catalogo_autorizado (autor_id, recurso, datos) VALUES (?, ?, ?)',
      [autorId, recurso, JSON.stringify(datos)],
    );
  },
};
