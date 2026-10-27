import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

// One fixed id, so turning it on again replaces the old one instead of adding a second.
const ID = 'card-reminder';
const CHANNEL = 'reminders';
export const REMINDER_HOUR = 19;

/** Daily 7:00 PM reminder, scheduled on the phone (no server, roadmap v1). False if the student denies permission. */
export async function scheduleReminder(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Card reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await cancelReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    // shortcut: a repeating notification can't count today's due cards, so the text has no number.
    content: { title: 'Time to review', body: 'Your Lucid cards are ready. It only takes a few minutes.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REMINDER_HOUR, minute: 0, channelId: CHANNEL },
  });
  return true;
}

export async function cancelReminder() {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
}
