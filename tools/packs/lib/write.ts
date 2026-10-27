/// <reference types="node" />
// One SQLite file per pack (docs/packs.md "Pack schema"). Node 22's built-in node:sqlite, compiled with FTS5.
import { existsSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export type PackChunk = { subject: string; grade: number; topic: string; title: string; text: string; sourceUrl: string };

export function writePack(file: string, meta: Record<string, string>, chunks: PackChunk[]) {
  if (existsSync(file)) rmSync(file);
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE chunks (
      id INTEGER PRIMARY KEY,
      subject TEXT NOT NULL,
      grade INTEGER,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      source_url TEXT
    );
    CREATE VIRTUAL TABLE chunks_fts USING fts5(title, text, content='chunks', content_rowid='id');
  `);
  db.exec('BEGIN');
  const putMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(meta)) putMeta.run(k, v);
  const putChunk = db.prepare('INSERT INTO chunks (subject, grade, topic, title, text, source_url) VALUES (?, ?, ?, ?, ?, ?)');
  for (const c of chunks) putChunk.run(c.subject, c.grade, c.topic, c.title, c.text, c.sourceUrl);
  // External-content FTS: build the index from `chunks` in one pass.
  db.exec(`INSERT INTO chunks_fts (chunks_fts) VALUES ('rebuild')`);
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();
}

/** Opens a built pack read-only and runs an FTS5 query: the same search the app will do. */
export function searchPack(file: string, query: string, limit = 3) {
  const db = new DatabaseSync(file, { readOnly: true });
  const rows = db
    .prepare(
      `SELECT c.title, c.topic, c.text FROM chunks_fts f JOIN chunks c ON c.id = f.rowid
       WHERE chunks_fts MATCH ? ORDER BY rank LIMIT ?`,
    )
    .all(query, limit) as { title: string; topic: string; text: string }[];
  db.close();
  return rows;
}
