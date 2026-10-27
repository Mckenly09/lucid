import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  /** Defaults to title and subtitle; pass one when `right` shows a value (Settings rows). */
  accessibilityLabel?: string;
  /** A second action (History: delete), also offered to screen readers as a named action. */
  onLongPress?: () => void;
  longPressLabel?: string;
};

export function ListItem({ title, subtitle, left, right, onPress, accessibilityLabel, onLongPress, longPressLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityActions={onLongPress ? [{ name: 'longpress', label: longPressLabel }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onLongPress?.()}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      className="min-h-11 flex-row items-center gap-3 border-b border-ink/10 py-3 active:bg-ink/5">
      {left}
      <View className="flex-1">
        <Text variant="body" className="font-medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

/** Two-letter subject tile used in History and Library (MA, SC…). */
export function SubjectCode({ code }: { code: string }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-md bg-ink/5">
      <Text variant="caption" tone="primary" className="font-bold">
        {code}
      </Text>
    </View>
  );
}
