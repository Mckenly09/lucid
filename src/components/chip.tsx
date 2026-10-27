import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  className?: string;
};

export function Chip({ label, selected, onPress, icon, className = '' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`min-h-11 flex-row items-center gap-2 rounded-full border px-4 ${selected ? 'border-primary bg-primary/10' : 'border-transparent bg-ink/5 active:bg-ink/10'} ${className}`}>
      {icon}
      <Text className="font-medium text-body text-ink">{label}</Text>
    </Pressable>
  );
}
