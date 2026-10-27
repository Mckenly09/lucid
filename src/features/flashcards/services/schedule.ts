// SM-2 spaced repetition (roadmap v1), with Anki-style first steps so a new card shows <1 min / 10 min / 1 day / 4 days.
export type Rating = 'again' | 'hard' | 'good' | 'easy';
/** A card's review state; `reps` counts successful reviews in a row (0 = new or forgotten). */
export type Review = { ease: number; intervalDays: number; reps: number };
export type Scheduled = Review & { dueAt: number };

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;
export const NEW_CARD: Review = { ease: 2.5, intervalDays: 0, reps: 0 };
const MIN_EASE = 1.3;

export function schedule(card: Review, rating: Rating, now: number): Scheduled {
  const { ease, intervalDays, reps } = card;
  switch (rating) {
    case 'again':
      return { ease: Math.max(MIN_EASE, ease - 0.2), intervalDays: 0, reps: 0, dueAt: now + MINUTE };
    case 'hard': {
      const next = { ease: Math.max(MIN_EASE, ease - 0.15), intervalDays: 0, reps };
      if (reps === 0) return { ...next, dueAt: now + 10 * MINUTE };
      const days = Math.max(intervalDays + 1, Math.round(intervalDays * 1.2));
      return { ...next, intervalDays: days, reps: reps + 1, dueAt: now + days * DAY };
    }
    case 'good': {
      const days = reps === 0 ? 1 : Math.max(intervalDays + 1, Math.round(intervalDays * ease));
      return { ease, intervalDays: days, reps: reps + 1, dueAt: now + days * DAY };
    }
    case 'easy': {
      const days = reps === 0 ? 4 : Math.max(intervalDays + 1, Math.round(intervalDays * ease * 1.3));
      return { ease: ease + 0.15, intervalDays: days, reps: reps + 1, dueAt: now + days * DAY };
    }
  }
}

/** "<1 min", "10 min", "1 day", "4 days", "2 mo" under each rating button. */
export function intervalLabel(ms: number) {
  if (ms < 2 * MINUTE) return '<1 min';
  if (ms < DAY) return ms < 60 * MINUTE ? `${Math.round(ms / MINUTE)} min` : `${Math.round(ms / (60 * MINUTE))} h`;
  const days = Math.round(ms / DAY);
  if (days < 60) return days === 1 ? '1 day' : `${days} days`;
  return `${Math.round(days / 30)} mo`;
}

/** Cards count as due for the whole local day, so the daily total doesn't change hour to hour. */
export const endOfDay = (t: number, plusDays = 0) => {
  const d = new Date(t);
  d.setDate(d.getDate() + plusDays);
  return d.setHours(23, 59, 59, 999);
};
