import { migrate } from './migrate';
import { MIGRATIONS } from './migrations';

/** Records the SQL run; user_version starts at `version`. */
function fakeDb(version: number) {
  const ran: string[] = [];
  const db = {
    getFirstSync: () => ({ user_version: version }),
    execSync: (sql: string) => {
      ran.push(sql.trim());
    },
    withTransactionSync: (task: () => void) => task(),
  } as unknown as Parameters<typeof migrate>[0];
  return { db, ran };
}

it('applies every migration to a new database, bumping the version after each', () => {
  const { db, ran } = fakeDb(0);
  migrate(db, ['A', 'B']);
  expect(ran).toEqual(['A', 'PRAGMA user_version = 1', 'B', 'PRAGMA user_version = 2']);
});

it('only applies migrations the database has not seen', () => {
  const { db, ran } = fakeDb(1);
  migrate(db, ['A', 'B']);
  expect(ran).toEqual(['B', 'PRAGMA user_version = 2']);
});

it('creates chats keyed by uid', () => {
  expect(MIGRATIONS[0]).toMatch(/CREATE TABLE chats[\s\S]*uid TEXT NOT NULL/);
});

it('creates cards keyed by uid, after chats', () => {
  expect(MIGRATIONS[1]).toMatch(/CREATE TABLE cards[\s\S]*uid TEXT NOT NULL/);
});

it('creates quiz results keyed by uid', () => {
  expect(MIGRATIONS[2]).toMatch(/CREATE TABLE quiz_results[\s\S]*uid TEXT NOT NULL/);
});

it('creates student packs keyed by uid, with a search index', () => {
  expect(MIGRATIONS[3]).toMatch(/CREATE TABLE user_packs[\s\S]*uid TEXT NOT NULL/);
  expect(MIGRATIONS[3]).toMatch(/USING fts5/);
});
