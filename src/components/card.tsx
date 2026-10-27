import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

const variants = {
  filled: 'bg-ink/5',
  outlined: 'border border-ink/10',
  selected: 'border border-primary',
} as const;

type Props = {
  children: ReactNode;
  variant?: keyof typeof variants;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

export function Card({ children, variant = 'filled', onPress, accessibilityLabel, className = '' }: Props) {
  const base = `rounded-lg p-4 ${variants[variant]} ${className}`;
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`${base} active:bg-ink/10`}>
      {children}
    </Pressable>
  );
}
