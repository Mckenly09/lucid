import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export type Role = 'user' | 'assistant';
export type ChatSummary = { id: string; subject: SubjectId; title: string; preview: string; updatedAt: number };
export type StoredChat = { id: string; subject: SubjectId; messages: { role: Role; content: string }[] };

const PREVIEW_CHARS = 120;

/** Saves one message; the chat row is created by its first message, so empty chats are never stored. */
export function saveMessage(uid: string, chat: { id: string; subject: SubjectId }, role: Role, content: string) {
  const db = getDb();
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync(
      'INSERT OR IGNORE INTO chats (id, uid, subject, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      chat.id,
      uid,
      chat.subject,
      content.slice(0, PREVIEW_CHARS),
      now,
      now,
    );
    db.runSync('INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)', chat.id, role, content, now);
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

export function getChat(uid: string, id: string): StoredChat | null {
  const db = getDb();
  const chat = db.getFirstSync<{ id: string; subject: SubjectId }>(
    'SELECT id, subject FROM chats WHERE id = ? AND uid = ?',
    id,
    uid,
  );
  if (!chat) return null;
  const messages = db.getAllSync<{ role: Role; content: string }>(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY id',
    id,
  );
  return { ...chat, messages };
}
