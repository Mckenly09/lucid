import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { toPath } from '@/features/models/services/files';

import { packFileName } from './services/catalog';

type PackRef = { id: string; version: number };

export const packsDir = () => new Directory(Paths.document, 'packs');
export const packFile = (p: PackRef) => new File(packsDir(), packFileName(p));
/** Downloads land here and only move to `packFile` after the checksum passes. */
export const packPartFile = (p: PackRef) => new File(packsDir(), `${packFileName(p)}.part`);

// Opened on first search and kept open: reopening a pack per question would cost more than the search.
const open = new Map<string, SQLiteDatabase>();

function db(p: PackRef) {
  const name = packFileName(p);
  let handle = open.get(name);
  if (!handle) {
    handle = openDatabaseSync(name, undefined, toPath(packsDir().uri));
    open.set(name, handle);
  }
  return handle;
}

/** Before deleting or replacing a pack file. */
export function closePack(p: PackRef) {
  const name = packFileName(p);
  open.get(name)?.closeSync();
  open.delete(name);
}

/**
 * FTS5 search in one pack, best first (bm25). Returns a ~48-word excerpt around the match, not the whole chunk,
 * so a few sources fit in the ~400-token notes budget.
 */
export function searchPack(p: PackRef, match: string, limit = 2) {
  return db(p).getAllSync<{ title: string; text: string }>(
    `SELECT c.title AS title, snippet(chunks_fts, 1, '', '', '…', 48) AS text
     FROM chunks_fts JOIN chunks c ON c.id = chunks_fts.rowid
     WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT ?`,
    match,
    limit,
  );
}
