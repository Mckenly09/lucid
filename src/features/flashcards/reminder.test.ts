import * as Notifications from 'expo-notifications';

import { countDueBetween } from '@/db/cards';

import { cancelReminder, scheduleReminder } from './reminder';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));
jest.mock('@/db/cards', () => ({ countDueBetween: jest.fn() }));

const n = jest.mocked(Notifications);
const scheduled = () => n.scheduleNotificationAsync.mock.calls.map(([req]) => req);

beforeEach(() => {
  jest.clearAllMocks();
  n.requestPermissionsAsync.mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  n.getPermissionsAsync.mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
  n.cancelScheduledNotificationAsync.mockResolvedValue();
  jest.mocked(countDueBetween).mockReturnValue(4);
});

it("schedules a week of evenings with the count of this student's due cards", async () => {
  await expect(scheduleReminder('u1')).resolves.toBe(true);
  expect(scheduled()).toHaveLength(7);
  expect(scheduled()[0].content).toEqual({ title: 'Time to review', body: 'You have 4 cards to review.' });
  expect(jest.mocked(countDueBetween).mock.calls.every(([uid]) => uid === 'u1')).toBe(true);
});

it('replaces earlier reminders, including the old daily one, instead of adding more', async () => {
  await scheduleReminder('u1');
  const cancelled = n.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id);
  expect(cancelled).toContain('card-reminder');
  expect(cancelled).toEqual(expect.arrayContaining(scheduled().map((r) => r.identifier)));
});

it('schedules nothing and says so when permission is denied', async () => {
  n.requestPermissionsAsync.mockResolvedValue({ granted: false } as Notifications.NotificationPermissionsStatus);
  await expect(scheduleReminder('u1')).resolves.toBe(false);
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('only checks permission when refreshing in the background, never asks again', async () => {
  await scheduleReminder('u1', { ask: false });
  expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(n.getPermissionsAsync).toHaveBeenCalled();
});

it('turning reminders off cancels all of them, even if one cancel fails', async () => {
  n.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error('not found'));
  await expect(cancelReminder()).resolves.toBeUndefined();
  expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(8);
});
