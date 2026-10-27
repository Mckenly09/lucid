import { View } from 'react-native';

import type { Status } from '@/components/badge';

const fills = {
  primary: 'bg-primary',
  default: 'bg-default',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const;

type Segment = { value: number; status?: Status | 'primary' };

type Props = {
  /** 0–1, or several stacked segments (storage bar). */
  value: number | Segment[];
  status?: Status | 'primary';
  label: string;
  className?: string;
};

export function ProgressBar({ value, status = 'primary', label, className = '' }: Props) {
  const segments = typeof value === 'number' ? [{ value, status }] : value;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(total * 100) }}
      className={`h-2 flex-row gap-0.5 overflow-hidden rounded-full bg-ink/10 ${className}`}>
      {segments.map((s, i) => (
        // Width is data, not design: the one inline style here.
        <View key={i} className={`h-full ${fills[s.status ?? 'primary']}`} style={{ width: `${Math.min(1, Math.max(0, s.value)) * 100}%` }} />
      ))}
    </View>
  );
}
