import { NativeTabs } from 'expo-router/native-tabs';

import { useColor } from '@/hooks/use-color';

export default function TabLayout() {
  const paper = useColor('paper');
  const ink = useColor('ink');
  const muted = useColor('default');

  return (
    <NativeTabs
      backgroundColor={paper}
      indicatorColor={paper}
      iconColor={{ default: muted, selected: ink }}
      labelStyle={{ default: { color: muted }, selected: { color: ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ask</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left" md="chat_bubble" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <NativeTabs.Trigger.Label>Cards</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="rectangle.on.rectangle" md="style" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.closed" md="book_2" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
