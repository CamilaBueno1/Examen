// Guía: Conserva el listado recibido y las fotos descargadas por cuenta y rol.

import { File, Paths } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import type { ActaRemota } from '../../../domain/usecases/revisarActas';

let connection: Promise<SQLiteDatabase> | undefined;

function database() {
  connection ??= openDatabaseAsync('actas-revision.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS revision_actas (cuenta TEXT PRIMARY KEY, datos TEXT NOT NULL)');
    return db;
  }).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

function archivo(cuenta: string, fotoId: string) {
  return new File(Paths.document, `revision-${encodeURIComponent(cuenta)}-${encodeURIComponent(fotoId)}.jpg`);
}

export const revisionActasCache = {
  async leer(cuenta: string): Promise<ActaRemota[] | null> {
    if (Platform.OS === 'web') return null;
    const db = await database();
    const row = await db.getFirstAsync<{ datos: string }>('SELECT datos FROM revision_actas WHERE cuenta = ?', [cuenta]);
    return row ? JSON.parse(row.datos) as ActaRemota[] : null;
  },
  async guardar(cuenta: string, actas: ActaRemota[]) {
    if (Platform.OS === 'web') return;
    const db = await database();
    await db.runAsync('INSERT OR REPLACE INTO revision_actas (cuenta, datos) VALUES (?, ?)', [cuenta, JSON.stringify(actas)]);
  },
  foto(cuenta: string, fotoId: string): string | undefined {
    if (Platform.OS === 'web') return undefined;
    const file = archivo(cuenta, fotoId);
    return file.exists && file.size > 0 ? file.uri : undefined;
  },
  async guardarFoto(cuenta: string, fotoId: string, url: string) {
    if (Platform.OS === 'web' || revisionActasCache.foto(cuenta, fotoId)) return;
    const destino = archivo(cuenta, fotoId);
    const temporal = new File(Paths.cache, `revision-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    try {
      const descargado = await File.downloadFileAsync(url, temporal);
      if (!descargado.exists || descargado.size <= 0) throw new Error('FOTO_DESCARGA_VACIA');
      if (!revisionActasCache.foto(cuenta, fotoId)) descargado.copy(destino, { overwrite: true });
      const uri = revisionActasCache.foto(cuenta, fotoId);
      if (!uri) throw new Error('FOTO_NO_GUARDADA');
      return uri;
    } finally {
      if (temporal.exists) temporal.delete();
    }
  },
};
