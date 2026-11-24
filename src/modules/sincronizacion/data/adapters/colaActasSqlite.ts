import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { ColaActas, OperacionActa } from '../../domain/usecases/enviarPendientes';

let db: Promise<SQLiteDatabase> | undefined;
function database() {
  db ??= openDatabaseAsync('local.db').catch((error: unknown) => {
    db = undefined;
    throw error;
  });
  return db;
}

export const colaActasSqlite: ColaActas = {
  async pendientes(autorId) {
    const connection = await database();
    const table = await connection.getFirstAsync(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'outbox_actas'",
    );
    if (!table) return [];
    const records = await connection.getAllAsync<{
      operation_id: string; payload: string; estado: string; intentos: number;
    }>(
      "SELECT operation_id, payload, estado, intentos FROM outbox_actas WHERE autor_id = ? AND estado IN ('PENDING', 'EVIDENCIA_PENDIENTE') ORDER BY rowid",
      [autorId],
    );
    return records.map((row) => ({
      id: row.operation_id, autorId, datos: JSON.parse(row.payload) as OperacionActa['datos'],
      estado: row.estado, intentos: row.intentos,
    }));
  },
  async cambiarEstado(operacion, estado, aumentarIntento = false) {
    const connection = await database();
    await connection.runAsync(
      'UPDATE outbox_actas SET estado = ?, intentos = intentos + ? WHERE operation_id = ? AND autor_id = ?',
      [estado, Number(aumentarIntento), operacion.id, operacion.autorId],
    );
  },
};
