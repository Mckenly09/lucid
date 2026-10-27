import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrate';
import { MIGRATIONS } from './migrations';

let db: SQLiteDatabase | null = null;

/** Opens on first use, so the database never slows cold start. */
export function getDb() {
  if (!db) {
    db = openDatabaseSync('lucid.db');
    db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    migrate(db, MIGRATIONS);
  }
  return db;
}
