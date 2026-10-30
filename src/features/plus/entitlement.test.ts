import { GRACE_MS, isPlusActive, plusStatus, toSnapshot } from './entitlement';

const NOW = Date.parse('2026-11-10T08:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const info = (expirationDate: string | null, willRenew = true) => ({
  entitlements: { all: { plus: { expirationDate, willRenew } } },
});

it('reads only the plus entitlement from the store', () => {
  expect(toSnapshot(info('2026-12-01T00:00:00Z'))).toEqual({
    expiresAt: Date.parse('2026-12-01T00:00:00Z'),
    willRenew: true,
  });
  expect(toSnapshot(info(null, false))).toEqual({
    expiresAt: null,
    willRenew: false,
  });
  expect(toSnapshot({ entitlements: { all: { pro: { expirationDate: null } } } })).toBeNull();
  expect(toSnapshot({ entitlements: { all: {} } })).toBeNull();
  expect(toSnapshot(null)).toBeNull();
});

it('is active inside the paid period, and forever without an expiry', () => {
  expect(plusStatus({ expiresAt: NOW + DAY, willRenew: true }, NOW)).toBe('active');
  expect(plusStatus({ expiresAt: null, willRenew: false }, NOW)).toBe('active');
});

it('keeps Plus for 3 days past expiry while offline', () => {
  const snap = { expiresAt: NOW - 2 * DAY, willRenew: true };
  expect(plusStatus(snap, NOW)).toBe('grace');
  expect(isPlusActive(snap, NOW)).toBe(true);
  expect(isPlusActive({ expiresAt: NOW - GRACE_MS + 1, willRenew: true }, NOW)).toBe(true);
});

it('asks to reconnect once the grace ends on a renewing plan', () => {
  const snap = { expiresAt: NOW - GRACE_MS, willRenew: true };
  expect(plusStatus(snap, NOW)).toBe('lapsed');
  expect(isPlusActive(snap, NOW)).toBe(false);
});

it('is plain free after a cancelled plan runs out, or with no Plus at all', () => {
  expect(plusStatus({ expiresAt: NOW - 4 * DAY, willRenew: false }, NOW)).toBe('free');
  expect(plusStatus(null, NOW)).toBe('free');
  expect(isPlusActive(undefined, NOW)).toBe(false);
});
