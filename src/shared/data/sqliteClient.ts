import * as SQLite from 'expo-sqlite';

export const sqliteClient = SQLite.openDatabaseSync('control-electoral.db');
