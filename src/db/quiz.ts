import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export function saveQuizResult(uid: string, result: { subject: SubjectId; chatId: string; score: number; total: number }) {
  getDb().runSync(
    'INSERT INTO quiz_results (uid, subject, chat_id, score, total, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    uid,
    result.subject,
    result.chatId,
    result.score,
    result.total,
    Date.now(),
  );
}
