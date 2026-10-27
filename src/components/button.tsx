import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { useColor } from '@/hooks/use-color';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press feedback: shrink on press-in so the tap feels heard before it commits.
const PRESS_TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: 120,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

const container = {
  primary: 'bg-primary active:bg-primary/90',
  secondary: 'bg-primary/10 active:bg-primary/20',
  ghost: 'bg-transparent active:bg-ink/5',
  danger: 'bg-danger active:bg-danger/90',
} as const;

const label = {
  primary: 'text-paper',
  secondary: 'text-primary',
  ghost: 'text-primary underline',
  danger: 'text-paper',
} as const;

const size = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-13 px-6',
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
  const spinner = useColor(variant === 'primary' || variant === 'danger' ? 'paper' : 'primary');
  const [pressed, setPressed] = useState(false);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[PRESS_TRANSITION, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-md ${size[s]} ${container[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}>
      {loading ? <ActivityIndicator color={spinner} /> : icon}
      <Text className={`font-semibold ${s === 'lg' ? 'text-body' : 'text-small'} ${label[variant]}`}>{text}</Text>
    </AnimatedPressable>
  );
}
