/** How many evenings ahead are scheduled; the app refreshes them each time it goes to the background. */
export const REMINDER_DAYS = 7;

export type PlannedReminder = { at: number; body: string };

/**
 * The next `REMINDER_DAYS` reminders at `hour`:00, each with the number of cards due by then.
 * Evenings with nothing due are skipped, so the student isn't nagged for nothing.
 */
export function reminderPlan(now: number, hour: number, countDueBy: (at: number) => number): PlannedReminder[] {
  const first = new Date(now);
  first.setHours(hour, 0, 0, 0);
  if (first.getTime() <= now) first.setDate(first.getDate() + 1);

  const plan: PlannedReminder[] = [];
  for (let i = 0; i < REMINDER_DAYS; i++) {
    // setDate keeps the same local time across daylight-saving changes.
    const day = new Date(first);
    day.setDate(first.getDate() + i);
    const n = countDueBy(day.getTime());
    if (n > 0) plan.push({ at: day.getTime(), body: `You have ${n} ${n === 1 ? 'card' : 'cards'} to review.` });
  }
  return plan;
}
