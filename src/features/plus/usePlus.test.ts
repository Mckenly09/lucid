import { act, renderHook } from '@testing-library/react-native';

import * as purchases from './purchases';
import { countStart, useDailyLimit, usePlus } from './usePlus';

// Never calls RevenueCat or Firebase (AGENTS.md testing rules).
jest.mock('./purchases', () => ({
  available: true,
  configure: jest.fn(async () => {}),
  logOut: jest.fn(async () => {}),
  getOffering: jest.fn(async () => '₱99.00'),
  getStatus: jest.fn(),
  buy: jest.fn(),
  restore: jest.fn(),
  isCancel: (e: { userCancelled?: boolean }) => e?.userCancelled === true,
  isPending: (e: { code?: string }) => e?.code === '20',
}));
let mockUid = 'u1';
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { uid: mockUid, isLocal: false } }) }));
jest.mock('@/utils/kv-storage', () => ({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));

const DAY = 24 * 60 * 60 * 1000;

it('keeps Plus when the store cannot be reached (offline)', async () => {
  jest.mocked(purchases.buy).mockResolvedValueOnce({ expiresAt: Date.now() + 30 * DAY, willRenew: true });
  const { result } = await renderHook(() => usePlus());
  await act(async () => {
    expect(await result.current.buy()).toBe(true);
  });

  jest.mocked(purchases.getStatus).mockRejectedValueOnce(new Error('offline'));
  await act(() => result.current.load());
  expect(result.current.isPlus).toBe(true);
});

it('says a pending payment is pending, never "try again"', async () => {
  jest.mocked(purchases.buy).mockRejectedValueOnce({ code: '20' });
  const { result } = await renderHook(() => usePlus());
  await act(async () => {
    expect(await result.current.buy()).toBe(false);
  });
  expect(result.current.error).toMatch(/pending/);
  expect(result.current.error).not.toMatch(/try again/i);
});

it('blocks the 6th Quiz me or Practice of the day on the free plan', async () => {
  // A different student than the tests above, so no Plus and a fresh count: the limit is per uid.
  mockUid = 'u2';
  const { result } = await renderHook(() => useDailyLimit());
  const start = jest.fn();
  for (let i = 0; i < 5; i++) {
    await act(async () => result.current.run(start));
    countStart('u2');
  }
  expect(start).toHaveBeenCalledTimes(5);
  await act(async () => result.current.run(start));
  expect(start).toHaveBeenCalledTimes(5);
  expect(result.current.blocked).toBe(true);
});
