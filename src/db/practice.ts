import type { QuizQuestion } from '@/features/quiz/services/parse';
import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export type TopicStats = { last: { score: number; total: number }; previous?: number; mastery: number };

/** Kept per topic; the oldest go first. Enough for several sessions of mixing, small on disk. */
const CACHE_LIMIT = 40;

export function savePracticeSession(
  uid: string,
  s: { subject: SubjectId; grade: number; topic: string; score: number; total: number },
) {
  getDb().runSync(
    'INSERT INTO practice_sessions (uid, subject, grade, topic, score, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uid,
    s.subject,
    s.grade,
    s.topic,
    s.score,
    s.total,
    Date.now(),
  );
}

/** Last score, the one before it, and mastery (average of the last 3 sessions, 0–1) for each practiced topic. */
export function topicStats(uid: string, subject: SubjectId, grade: number): Record<string, TopicStats> {
  const rows = getDb().getAllSync<{ topic: string; score: number; total: number }>(
    `SELECT topic, score, total FROM practice_sessions WHERE uid = ? AND subject = ? AND grade = ?
     ORDER BY created_at DESC, id DESC`,
    uid,
    subject,
    grade,
  );
  const byTopic: Record<string, { score: number; total: number }[]> = {};
  for (const { topic, score, total } of rows) (byTopic[topic] ??= []).push({ score, total });
  return Object.fromEntries(
    Object.entries(byTopic).map(([topic, [last, before, ...rest]]) => {
      const recent = [last, before, rest[0]].filter(Boolean);
      const mastery = recent.reduce((sum, s) => sum + (s.total ? s.score / s.total : 0), 0) / recent.length;
      return [topic, { last, previous: before?.score, mastery }];
    }),
  );
}

export function cachedQuestions(topic: string, packKey: string): QuizQuestion[] {
  return getDb()
    .getAllSync<{ json: string }>(
      'SELECT json FROM practice_questions WHERE topic = ? AND pack_key = ?',
      topic,
      packKey,
    )
    .flatMap(({ json }) => {
      try {
        return [JSON.parse(json) as QuizQuestion];
      } catch {
        return [];
      }
    });
}

/** Adds checked questions, drops ones from older pack versions, and keeps the newest CACHE_LIMIT. */
export function cacheQuestions(topic: string, packKey: string, questions: QuizQuestion[]) {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM practice_questions WHERE topic = ? AND pack_key <> ?', topic, packKey);
    const now = Date.now();
    for (const q of questions)
      db.runSync(
        'INSERT INTO practice_questions (topic, pack_key, json, created_at) VALUES (?, ?, ?, ?)',
        topic,
        packKey,
        JSON.stringify(q),
        now,
      );
    db.runSync(
      `DELETE FROM practice_questions WHERE topic = ? AND id NOT IN
       (SELECT id FROM practice_questions WHERE topic = ? ORDER BY created_at DESC, id DESC LIMIT ?)`,
      topic,
      topic,
      CACHE_LIMIT,
    );
  });
}
