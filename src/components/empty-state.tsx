import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/text';

type Props = { icon?: ReactNode; title: string; message: string; action?: ReactNode };

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-4 py-12">
      {icon}
      <Text variant="h2" className="text-center">{title}</Text>
      <Text tone="muted" className="text-center">{message}</Text>
      {action}
    </View>
  );
}
