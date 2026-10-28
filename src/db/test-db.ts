// Tests only: a real in-memory SQLite (Node's built-in node:sqlite, FTS5 included) behind the few expo-sqlite calls
// the app uses, with the app's own migrations applied. Queries are tested for real, not as SQL strings.
// Use with: jest.mock('./client', () => ({ getDb: jest.fn() })) and jest.mocked(getDb).mockReturnValue(testDb()).
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { getDb } from './client';
import { migrate } from './migrate';
import { MIGRATIONS } from './migrations';

type Db = ReturnType<typeof getDb>;

// expo-sqlite takes params spread or as one array; node:sqlite has no `undefined` or booleans.
const params = (args: unknown[]) =>
  (args.length === 1 && Array.isArray(args[0]) ? args[0] : args).map((v) =>
    v === undefined ? null : typeof v === 'boolean' ? Number(v) : v,
  ) as SQLInputValue[];

export function testDb(): Db {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const db = {
    execSync: (sql: string) => sqlite.exec(sql),
    runSync: (sql: string, ...args: unknown[]) => sqlite.prepare(sql).run(...params(args)),
    getFirstSync: (sql: string, ...args: unknown[]) => sqlite.prepare(sql).get(...params(args)) ?? null,
    getAllSync: (sql: string, ...args: unknown[]) => sqlite.prepare(sql).all(...params(args)),
    withTransactionSync: (task: () => void) => {
      sqlite.exec('BEGIN');
      try {
        task();
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as Db;
  migrate(db, MIGRATIONS);
  return db;
}
