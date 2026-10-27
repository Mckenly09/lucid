import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

const variants = {
  plain: 'active:bg-ink/10',
  filled: 'bg-primary active:bg-primary/90',
} as const;

type Props = {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: keyof typeof variants;
  disabled?: boolean;
  className?: string;
};

export function IconButton({ icon, onPress, accessibilityLabel, variant = 'plain', disabled, className = '' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className={`h-11 w-11 items-center justify-center rounded-full ${variants[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}>
      {icon}
    </Pressable>
  );
}
