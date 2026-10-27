import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useColor } from '@/hooks/use-color';

const container = {
  primary: 'bg-primary active:bg-primary/90',
  secondary: 'bg-ink/10 active:bg-ink/20',
  ghost: 'bg-transparent active:bg-ink/5',
  danger: 'bg-danger active:bg-danger/90',
} as const;

const label = {
  primary: 'text-paper',
  secondary: 'text-ink',
  ghost: 'text-ink underline',
  danger: 'text-paper',
} as const;

const size = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-14 px-6',
} as const;

type Props = {
  label: string;
  onPress: () => void;
  variant?: keyof typeof container;
  size?: keyof typeof size;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string; // layout only (margin, flex)
};

export function Button({
  label: text,
  onPress,
  variant = 'primary',
  size: s = 'md',
  icon,
  loading,
  disabled,
  className = '',
}: Props) {
  const spinner = useColor(variant === 'primary' || variant === 'danger' ? 'paper' : 'ink');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-md ${size[s]} ${container[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}>
      {loading ? <ActivityIndicator color={spinner} /> : icon}
      <Text className={`font-semibold ${s === 'sm' ? 'text-small' : 'text-body'} ${label[variant]}`}>
        {text}
      </Text>
    </Pressable>
  );
}
