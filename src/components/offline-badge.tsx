import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

export function OfflineBadge() {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full bg-default/10 px-2 py-1"
      accessibilityLabel="Offline, AI runs on this device">
      <Icon name="Circle" size={8} tone="default" />
      <Text variant="caption" tone="default">
        Offline · on-device
      </Text>
    </View>
  );
}
