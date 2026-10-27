import { groupOf } from './when';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const now = at(2026, 10, 27, 9); // Tuesday morning

describe('groupOf', () => {
  it('uses calendar days, not 24-hour windows', () => {
    expect(groupOf(at(2026, 10, 27, 0), now)).toBe('Today');
    expect(groupOf(at(2026, 10, 26, 23), now)).toBe('Yesterday'); // 10 hours ago
  });

  it('groups the rest of the week, then earlier', () => {
    expect(groupOf(at(2026, 10, 21), now)).toBe('This week');
    expect(groupOf(at(2026, 10, 20), now)).toBe('Earlier');
  });

  it('treats a clock set slightly back as today', () => {
    expect(groupOf(now + 60_000, now)).toBe('Today');
  });
});
