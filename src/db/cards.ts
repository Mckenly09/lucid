import { NEW_CARD, type Scheduled } from '@/features/flashcards/services/schedule';
import type { SubjectId } from '@/llm/subjects/config';

import { getDb } from './client';

export type FlashCard = {
  id: string;
  subject: SubjectId;
  front: string;
  back: string;
  chatId: string | null;
  ease: number;
  intervalDays: number;
  reps: number;
  dueAt: number;
};
/** One subject's cards: `learned` have passed at least a day's interval. */
export type Deck = { subject: SubjectId; total: number; learned: number; due: number };

const COLUMNS = `id, subject, front, back, chat_id AS chatId, ease, interval_days AS intervalDays, reps, due_at AS dueAt`;

/** New cards are due right away. */
export function saveCard(uid: string, card: { subject: SubjectId; front: string; back: string; chatId?: string }) {
  const now = Date.now();
  getDb().runSync(
    `INSERT INTO cards (id, uid, subject, front, back, chat_id, ease, interval_days, reps, due_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    `${now}-${Math.random().toString(36).slice(2, 8)}`,
    uid,
    card.subject,
    card.front,
    card.back,
    card.chatId ?? null,
    NEW_CARD.ease,
    NEW_CARD.intervalDays,
    NEW_CARD.reps,
    now,
    now,
    now,
  );
}

/** Due at or before `before`, oldest first. */
export function listDueCards(uid: string, before: number): FlashCard[] {
  return getDb().getAllSync<FlashCard>(
    `SELECT ${COLUMNS} FROM cards WHERE uid = ? AND due_at <= ? ORDER BY due_at, created_at`,
    uid,
    before,
  );
}

export function saveReview(uid: string, id: string, next: Scheduled) {
  getDb().runSync(
    'UPDATE cards SET ease = ?, interval_days = ?, reps = ?, due_at = ?, updated_at = ? WHERE id = ? AND uid = ?',
    next.ease,
    next.intervalDays,
    next.reps,
    next.dueAt,
    Date.now(),
    id,
    uid,
  );
}

/** Per subject, biggest deck first. */
export function listDecks(uid: string, dueBefore: number): Deck[] {
  return getDb().getAllSync<Deck>(
    `SELECT subject, COUNT(*) AS total, SUM(interval_days >= 1) AS learned, SUM(due_at <= ?) AS due
     FROM cards WHERE uid = ? GROUP BY subject ORDER BY total DESC`,
    dueBefore,
    uid,
  );
}

/** Cards that come due after `from` and at or before `to` ("Next review: tomorrow · 8 cards"). */
export function countDueBetween(uid: string, from: number, to: number) {
  return (
    getDb().getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM cards WHERE uid = ? AND due_at > ? AND due_at <= ?',
      uid,
      from,
      to,
    )?.n ?? 0
  );
}
