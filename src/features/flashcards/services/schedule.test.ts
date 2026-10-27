import { DAY, endOfDay, intervalLabel, MINUTE, NEW_CARD, type Rating, schedule } from './schedule';

const now = new Date(2026, 9, 27, 19, 0).getTime();
const label = (r: Rating, card = NEW_CARD) => intervalLabel(schedule(card, r, now).dueAt - now);

it('gives a new card the intervals shown on the rating buttons', () => {
  expect([label('again'), label('hard'), label('good'), label('easy')]).toEqual(['<1 min', '10 min', '1 day', '4 days']);
});

it('grows the interval by the ease factor on each Good', () => {
  let card = schedule(NEW_CARD, 'good', now); // 1 day
  card = schedule(card, 'good', now); // 1 * 2.5 → at least +1 → 3
  expect(card.intervalDays).toBe(3);
  card = schedule(card, 'good', now); // 3 * 2.5 = 7.5 → 8
  expect(card.intervalDays).toBe(8);
  expect(card.dueAt).toBe(now + 8 * DAY);
});

it('resets a forgotten card and lowers its ease, never below 1.3', () => {
  let card = schedule(schedule(NEW_CARD, 'good', now), 'again', now);
  expect(card).toMatchObject({ reps: 0, intervalDays: 0, dueAt: now + MINUTE });
  expect(card.ease).toBeCloseTo(2.3);
  for (let i = 0; i < 10; i++) card = schedule(card, 'again', now);
  expect(card.ease).toBe(1.3);
});

it('makes Hard shorter than Good and Easy longer, for a card already learned', () => {
  const learned = { ease: 2.5, intervalDays: 10, reps: 3 };
  const days = (r: Rating) => schedule(learned, r, now).intervalDays;
  expect(days('hard')).toBe(12);
  expect(days('good')).toBe(25);
  expect(days('easy')).toBe(33);
});

it('counts the whole local day as due', () => {
  expect(new Date(endOfDay(now)).getHours()).toBe(23);
  expect(endOfDay(now, 1) - endOfDay(now)).toBe(DAY);
});
