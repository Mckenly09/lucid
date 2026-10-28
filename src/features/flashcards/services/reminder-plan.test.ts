import { REMINDER_DAYS, reminderPlan } from './reminder-plan';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

it('starts tonight before 7 PM and tomorrow after it', () => {
  expect(reminderPlan(at(28, 18), 19, () => 1)[0].at).toBe(at(28, 19));
  expect(reminderPlan(at(28, 19), 19, () => 1)[0].at).toBe(at(29, 19));
  expect(reminderPlan(at(28, 21), 19, () => 1)).toHaveLength(REMINDER_DAYS);
});

it('says how many cards are due by each evening, and skips evenings with none', () => {
  // 1 card due tonight, none more until the 30th, then 8.
  const plan = reminderPlan(at(28, 9), 19, (t) => (t < at(30, 0) ? (t < at(29, 0) ? 1 : 0) : 8));
  expect(plan[0]).toEqual({ at: at(28, 19), body: 'You have 1 card to review.' });
  expect(plan[1]).toEqual({ at: at(30, 19), body: 'You have 8 cards to review.' });
  expect(plan.some((p) => p.at === at(29, 19))).toBe(false);
});

it('plans nothing when no cards will be due', () => {
  expect(reminderPlan(at(28, 9), 19, () => 0)).toEqual([]);
});
