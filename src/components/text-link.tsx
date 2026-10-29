import { Pressable } from 'react-native';

import { Text, type TextTone, type TextVariant } from '@/components/text';

type Props = { label: string; onPress: () => void; variant?: TextVariant; tone?: TextTone; disabled?: boolean };

/** Underlined text link with a 44px-tall tap area (plain Text with onPress is only as tall as its line). */
export function TextLink({ label, onPress, variant = 'body', tone = 'ink', disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={{ left: 4, right: 4 }}
      className={`min-h-11 justify-center active:opacity-60 ${disabled ? 'opacity-40' : ''}`}>
      <Text variant={variant} tone={tone} className="font-semibold underline">
        {label}
      </Text>
    </Pressable>
  );
}
