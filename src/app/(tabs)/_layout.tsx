import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/features/auth/useAuth';
import { scheduleReminder } from '@/features/flashcards/reminder';
import { useSettings } from '@/features/settings/store';

// JS tabs with our own bar: the native Material bar can't match the design (flat bar, top border, caption labels).
export default function TabLayout() {
  const uid = useAuth().user?.uid;
  const reminder = useSettings((s) => s.reminder);
  // Card reminders carry the count due each evening; recount when the student leaves the app (reviews, new cards).
  useEffect(() => {
    if (!uid || !reminder) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') void scheduleReminder(uid, { ask: false }).catch(() => {});
    });
    return () => sub.remove();
  }, [uid, reminder]);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ask" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
