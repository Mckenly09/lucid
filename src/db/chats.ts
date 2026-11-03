import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export type Role = 'user' | 'assistant';
export type ChatSummary = { id: string; subject: SubjectId; title: string; preview: string; updatedAt: number };
export type StoredChat = {
  id: string;
  subject: SubjectId;
  course: string | null;
  messages: { role: Role; content: string; sources?: string[] }[];
};

const PREVIEW_CHARS = 120;

/** Saves one message; the chat row is created by its first message, so empty chats are never stored. */
export function saveMessage(
  uid: string,
  chat: { id: string; subject: SubjectId; course?: string | null },
  role: Role,
  content: string,
  sources?: string[],
) {
  const db = getDb();
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync(
      'INSERT OR IGNORE INTO chats (id, uid, subject, course, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      chat.id,
      uid,
      chat.subject,
      chat.course ?? null,
      content.slice(0, PREVIEW_CHARS),
      now,
      now,
    );
    db.runSync(
      'INSERT INTO messages (chat_id, role, content, created_at, sources) VALUES (?, ?, ?, ?, ?)',
      chat.id,
      role,
      content,
      now,
      sources?.length ? JSON.stringify(sources) : null,
    );
    // The preview is the first answer, like the History design.
    db.runSync(
      `UPDATE chats SET updated_at = ?, preview = CASE WHEN ? = 'assistant' AND preview = '' THEN ? ELSE preview END
       WHERE id = ? AND uid = ?`,
      now,
      role,
      content.slice(0, PREVIEW_CHARS).replace(/\s+/g, ' ').trim(),
      chat.id,
      uid,
    );
  });
}

/** Newest first. `search` matches the question or the answer preview. */
/** Follow-up questions use the new subject; earlier answers stay as they were. The course belonged to the old subject. */
export function setChatSubject(uid: string, id: string, subject: SubjectId) {
  getDb().runSync('UPDATE chats SET subject = ?, course = NULL WHERE id = ? AND uid = ?', subject, id, uid);
}

export function listChats(uid: string, search = '', limit = 200): ChatSummary[] {
  const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return getDb().getAllSync<ChatSummary>(
    `SELECT id, subject, title, preview, updated_at AS updatedAt FROM chats
     WHERE uid = ? AND (? = '' OR title LIKE ? ESCAPE '\\' OR preview LIKE ? ESCAPE '\\')
     ORDER BY updated_at DESC LIMIT ?`,
    uid,
    search,
    like,
    like,
    limit,
  );
}

/**
 * The newest answered chat that started with this question (case and outer spaces ignored), so asking it again reopens it.
 * Compares the full first message, not the title: titles stop at PREVIEW_CHARS, and long word problems often differ only at the end.
 */
export function findAnsweredChat(uid: string, question: string): string | null {
  return (
    getDb().getFirstSync<{ id: string }>(
      `SELECT c.id FROM chats c
       JOIN messages m ON m.id = (SELECT MIN(id) FROM messages WHERE chat_id = c.id)
       WHERE c.uid = ? AND c.preview != '' AND trim(m.content) = ? COLLATE NOCASE
       ORDER BY c.updated_at DESC LIMIT 1`,
      uid,
      question.trim(),
    )?.id ?? null
  );
}

export function getChat(uid: string, id: string): StoredChat | null {
  const db = getDb();
  const chat = db.getFirstSync<{ id: string; subject: SubjectId; course: string | null }>(
    'SELECT id, subject, course FROM chats WHERE id = ? AND uid = ?',
    id,
    uid,
  );
  if (!chat) return null;
  const rows = db.getAllSync<{ role: Role; content: string; sources: string | null }>(
    'SELECT role, content, sources FROM messages WHERE chat_id = ? ORDER BY id',
    id,
  );
  const messages = rows.map(({ sources, ...m }) => (sources ? { ...m, sources: JSON.parse(sources) as string[] } : m));
  return { ...chat, messages };
}

/** Messages go with it (ON DELETE CASCADE); its cards stay, unlinked (002-cards). */
export function deleteChat(uid: string, id: string) {
  getDb().runSync('DELETE FROM chats WHERE id = ? AND uid = ?', id, uid);
}
