// Guía: Conserva la sesión y el perfil local para recuperarlos sin conexión.

import { Platform } from 'react-native';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { User } from '../../../domain/entities';

// Reutiliza la conexión SQLite para las dos tablas de autenticación.
let connection: Promise<SQLiteDatabase> | undefined;

function database() {
  connection ??= openDatabaseAsync('local.db')
    .then(async (db) => {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS auth_storage (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS auth_user_cache (
            singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
            value TEXT NOT NULL
          );
        `);
        return db;
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}

function hasWebStorage() {
  return Platform.OS === 'web' && typeof globalThis.localStorage !== 'undefined';
}

// Guarda la sesión del SDK. En web usa el almacenamiento del navegador.
export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (hasWebStorage()) return globalThis.localStorage.getItem(key);
    const db = await database();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM auth_storage WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (hasWebStorage()) {
      globalThis.localStorage.setItem(key, value);
      return;
    }
    const db = await database();
    await db.runAsync(
      'INSERT OR REPLACE INTO auth_storage (key, value) VALUES (?, ?)',
      [key, value],
    );
  },
  async removeItem(key: string): Promise<void> {
    if (hasWebStorage()) {
      globalThis.localStorage.removeItem(key);
      return;
    }
    const db = await database();
    await db.runAsync('DELETE FROM auth_storage WHERE key = ?', [key]);
  },
};

// Mantiene una copia del perfil para restaurar el acceso sin conexión.
export class SqliteAuthDao {
  async saveUser(user: User): Promise<void> {
    const db = await database();
    await db.runAsync(
      'INSERT OR REPLACE INTO auth_user_cache (singleton, value) VALUES (1, ?)',
      [JSON.stringify(user)],
    );
  }

  async loadUser(): Promise<User | null> {
    const db = await database();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM auth_user_cache WHERE singleton = 1',
    );
    if (!row) return null;
    return JSON.parse(row.value) as User;
  }

  async clearUser(): Promise<void> {
    const db = await database();
    await db.runAsync('DELETE FROM auth_user_cache WHERE singleton = 1');
  }
}
