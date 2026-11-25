// Guía: Abre la base SQLite compartida declarada por este cliente.

import * as SQLite from 'expo-sqlite';

export const sqliteClient = SQLite.openDatabaseSync('control-electoral.db');
