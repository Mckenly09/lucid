import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, left, right, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      className="min-h-11 flex-row items-center gap-3 border-b border-ink/10 py-3 active:bg-ink/5">
      {left}
      <View className="flex-1">
        <Text variant="body" className="text-h3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" tone="muted" className="text-body" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

/** Two-letter subject tile used in History and Library (MA, SC…). */
export function SubjectTile({ code }: { code: string }) {
  return (
    <View className="h-11 w-11 items-center justify-center rounded-md bg-ink/5">
      <Text variant="caption" className="font-bold">
        {code}
      </Text>
    </View>
  );
}
