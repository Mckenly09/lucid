import { dayKey, FREE_DAILY, record, remaining } from './limits';

// Local-time constructors, so the tests hold in any time zone.
const morning = new Date(2026, 10, 10, 8, 0);
const lateNight = new Date(2026, 10, 10, 23, 59);
const nextDay = new Date(2026, 10, 11, 0, 0);

it('keys the day by the local date', () => {
  expect(dayKey(morning)).toBe('2026-11-10');
  expect(dayKey(nextDay)).toBe('2026-11-11');
});

it('counts starts until the free limit is used up', () => {
  let usage;
  for (let i = 0; i < FREE_DAILY; i++) {
    expect(remaining(usage, morning, false)).toBe(FREE_DAILY - i);
    usage = record(usage, morning);
  }
  expect(remaining(usage, lateNight, false)).toBe(0);
});

it('resets at local midnight', () => {
  const used = { day: dayKey(lateNight), used: FREE_DAILY };
  expect(remaining(used, nextDay, false)).toBe(FREE_DAILY);
  expect(record(used, nextDay)).toEqual({ day: '2026-11-11', used: 1 });
});

it('never limits Plus', () => {
  expect(remaining({ day: dayKey(morning), used: 50 }, morning, true)).toBe(Infinity);
});
