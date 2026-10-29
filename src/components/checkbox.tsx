import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Read by screen readers; `children` is what's shown (it can hold links). */
  accessibilityLabel: string;
  children: ReactNode;
};

/** A tappable agreement row; the row is tinted while checked. */
export function Checkbox({ checked, onChange, accessibilityLabel, children }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      className={`min-h-11 flex-row items-start gap-3 rounded-md p-3 active:bg-ink/10 ${checked ? 'bg-ink/5' : ''}`}>
      <View
        className={`h-6 w-6 items-center justify-center rounded-sm border ${checked ? 'border-primary bg-primary' : 'border-ink/20'}`}>
        {checked && <Icon name="Check" size={16} tone="paper" />}
      </View>
      <Text variant="small" className="flex-1">
        {children}
      </Text>
    </Pressable>
  );
}
