import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';

// JS tabs with our own bar: the native Material bar can't match the design (flat bar, top border, caption labels).
export default function TabLayout() {
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
