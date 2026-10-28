import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { countDueBetween } from '@/db/cards';

import { REMINDER_DAYS, reminderPlan } from './services/reminder-plan';

// Fixed ids, so scheduling again replaces the old reminders instead of adding more.
const IDS = Array.from({ length: REMINDER_DAYS }, (_, i) => `card-reminder-${i}`);
// The daily repeating reminder from before the count; cancelled so it can't fire next to the new ones.
const OLD_ID = 'card-reminder';
const CHANNEL = 'reminders';
export const REMINDER_HOUR = 19;

/**
 * Schedules the next evenings' 7:00 PM reminders with the number of cards due ("You have 8 cards to review"),
 * on the phone (no server, roadmap v1). `ask: false` only refreshes, never prompting. False without permission.
 */
export async function scheduleReminder(uid: string, { ask = true } = {}): Promise<boolean> {
  const { granted } = ask ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Card reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await cancelReminder();
  // shortcut: only the next 7 evenings are scheduled; if Lucid isn't opened for a week, reminders stop until it is.
  const plan = reminderPlan(Date.now(), REMINDER_HOUR, (at) => countDueBetween(uid, 0, at));
  await Promise.all(
    plan.map((r, i) =>
      Notifications.scheduleNotificationAsync({
        identifier: IDS[i],
        content: { title: 'Time to review', body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      }),
    ),
  );
  return true;
}

export async function cancelReminder() {
  await Promise.all([OLD_ID, ...IDS].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
