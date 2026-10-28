import { type BackupData, type Row, SCHEMA, TABLES } from '@/features/backup/services/backup';

import { getDb } from './client';

const TABLE_NAMES = {
  chats: 'chats',
  messages: 'messages',
  cards: 'cards',
  quizResults: 'quiz_results',
  userPacks: 'user_packs',
  userNotes: 'user_notes',
} as const;

// Messages and notes have no uid: they belong to the account through their chat or pack.
const OWNER = {
  messages: 'JOIN chats o ON o.id = t.chat_id WHERE o.uid = ? ORDER BY t.id',
  userNotes: 'JOIN user_packs o ON o.id = t.pack_id WHERE o.uid = ? ORDER BY t.id',
} as const;

/** Everything one account has saved, for Export. */
export function readBackupData(uid: string): BackupData {
  const db = getDb();
  const out = {} as BackupData;
  for (const t of TABLES) {
    const cols = Object.keys(SCHEMA[t]).map((c) => `t.${c}`).join(', ');
    const where = t === 'messages' || t === 'userNotes' ? OWNER[t] : 'WHERE t.uid = ?';
    out[t] = db.getAllSync<Row>(`SELECT ${cols} FROM ${TABLE_NAMES[t]} t ${where}`, uid);
  }
  return out;
}

/** Adds an already validated and re-keyed backup to this account, all or nothing. */
export function insertBackupData(uid: string, data: BackupData) {
  const db = getDb();
  db.withTransactionSync(() => {
    // TABLES lists parents before children, so foreign keys resolve.
    for (const t of TABLES) {
      const owned = t !== 'messages' && t !== 'userNotes';
      const cols = [...Object.keys(SCHEMA[t]), ...(owned ? ['uid'] : [])];
      const sql = `INSERT INTO ${TABLE_NAMES[t]} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
      for (const row of data[t]) db.runSync(sql, ...Object.keys(SCHEMA[t]).map((c) => row[c]), ...(owned ? [uid] : []));
    }
  });
}
