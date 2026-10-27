import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export type Status = 'default' | 'success' | 'warning' | 'danger';

const styles = {
  default: { bg: 'bg-ink/10', text: 'text-ink/80' },
  success: { bg: 'bg-success/10', text: 'text-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  danger: { bg: 'bg-danger/10', text: 'text-danger' },
} as const;

type Props = {
  label: string;
  status?: Status;
  icon?: ReactNode;
  /** Makes the badge a small action (Update, Retry). */
  onPress?: () => void;
  className?: string;
};

export function Badge({ label, status = 'default', icon, onPress, className = '' }: Props) {
  const s = styles[status];
  const content = (
    <>
      {icon}
      <Text className={`font-medium text-small ${s.text}`}>{label}</Text>
    </>
  );
  const base = `flex-row items-center gap-1 rounded-full px-3 ${s.bg} ${className}`;
  if (!onPress) return <View className={`${base} py-1`}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`${base} min-h-11 min-w-11 justify-center active:opacity-80`}>
      {content}
    </Pressable>
  );
}
