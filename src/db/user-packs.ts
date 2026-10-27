import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export type UserPack = { id: string; name: string; subject: SubjectId; notes: number; updatedAt: number };
export type UserNote = { id: number; title: string; text: string };
export type NoteHit = { packName: string; title: string; text: string };

/** Every query checks the pack belongs to `uid`, so one student never reads or edits another's notes. */
const OWNED = 'SELECT id FROM user_packs WHERE id = ? AND uid = ?';

export function listUserPacks(uid: string): UserPack[] {
  return getDb().getAllSync<UserPack>(
    `SELECT p.id, p.name, p.subject, p.updated_at AS updatedAt, COUNT(n.id) AS notes
     FROM user_packs p LEFT JOIN user_notes n ON n.pack_id = p.id
     WHERE p.uid = ? GROUP BY p.id ORDER BY p.updated_at DESC`,
    uid,
  );
}

export function getUserPack(uid: string, id: string): UserPack | null {
  return listUserPacks(uid).find((p) => p.id === id) ?? null;
}

export function createUserPack(uid: string, pack: { name: string; subject: SubjectId }) {
  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  getDb().runSync(
    'INSERT INTO user_packs (id, uid, name, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    uid,
    pack.name,
    pack.subject,
    now,
    now,
  );
  return id;
}

export function updateUserPack(uid: string, id: string, pack: { name: string; subject: SubjectId }) {
  getDb().runSync(
    'UPDATE user_packs SET name = ?, subject = ?, updated_at = ? WHERE id = ? AND uid = ?',
    pack.name,
    pack.subject,
    Date.now(),
    id,
    uid,
  );
}

/** Its notes go too (ON DELETE CASCADE), and the search index with them (triggers in 004-user-packs). */
export function deleteUserPack(uid: string, id: string) {
  getDb().runSync('DELETE FROM user_packs WHERE id = ? AND uid = ?', id, uid);
}

export function listNotes(uid: string, packId: string): UserNote[] {
  return getDb().getAllSync<UserNote>(
    `SELECT id, title, text FROM user_notes WHERE pack_id IN (${OWNED}) ORDER BY id`,
    packId,
    uid,
  );
}

export function getNote(uid: string, packId: string, noteId: number): UserNote | null {
  return getDb().getFirstSync<UserNote>(
    `SELECT id, title, text FROM user_notes WHERE id = ? AND pack_id IN (${OWNED})`,
    noteId,
    packId,
    uid,
  );
}

/** Adds notes in one transaction (an imported file is all or nothing) and bumps the pack to the top of the list. */
export function addNotes(uid: string, packId: string, notes: { title: string; text: string }[]) {
  const db = getDb();
  const now = Date.now();
  db.withTransactionSync(() => {
    if (!db.getFirstSync(OWNED, packId, uid)) throw new Error('Pack not found');
    for (const n of notes) {
      db.runSync(
        'INSERT INTO user_notes (pack_id, title, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        packId,
        n.title,
        n.text,
        now,
        now,
      );
    }
    db.runSync('UPDATE user_packs SET updated_at = ? WHERE id = ?', now, packId);
  });
}

export function updateNote(uid: string, packId: string, noteId: number, note: { title: string; text: string }) {
  getDb().runSync(
    `UPDATE user_notes SET title = ?, text = ?, updated_at = ? WHERE id = ? AND pack_id IN (${OWNED})`,
    note.title,
    note.text,
    Date.now(),
    noteId,
    packId,
    uid,
  );
}

export function deleteNote(uid: string, packId: string, noteId: number) {
  getDb().runSync(`DELETE FROM user_notes WHERE id = ? AND pack_id IN (${OWNED})`, noteId, packId, uid);
}

/** Best matches first (bm25) among this student's packs for the subject, plus their General packs. */
export function searchUserNotes(uid: string, subject: SubjectId, match: string, limit = 3): NoteHit[] {
  return getDb().getAllSync<NoteHit>(
    `SELECT p.name AS packName, n.title, n.text
     FROM user_notes_fts f
     JOIN user_notes n ON n.id = f.rowid
     JOIN user_packs p ON p.id = n.pack_id
     WHERE user_notes_fts MATCH ? AND p.uid = ? AND p.subject IN (?, 'general')
     ORDER BY bm25(user_notes_fts) LIMIT ?`,
    match,
    uid,
    subject,
    limit,
  );
}
