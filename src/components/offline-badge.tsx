import { View } from 'react-native';

import { Text } from '@/components/text';

export function OfflineBadge() {
  return (
    <View className="flex-row items-center gap-2 rounded-full bg-ink/5 px-3 py-2" accessibilityLabel="Offline, AI runs on this device">
      <View className="h-2 w-2 rounded-full border border-ink/60" />
      <Text variant="small" tone="muted">Offline · on-device</Text>
    </View>
  );
}
