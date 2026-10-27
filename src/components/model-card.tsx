import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';

export type ModelStatus = 'available' | 'downloading' | 'paused' | 'ready' | 'failed';

type Props = {
  name: string;
  description: string;
  sizeMB: number;
  status: ModelStatus;
  progress?: number;
  minutesLeft?: number;
  recommended?: boolean;
  tooBig?: boolean;
  selected?: boolean;
  onPress?: () => void;
};

export function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export function ModelCard(p: Props) {
  const badge = p.tooBig ? (
    <Badge label="Needs more memory" status="warning" />
  ) : p.status === 'ready' ? (
    <Badge label="Ready" status="success" />
  ) : p.recommended ? (
    <Badge label="Recommended" />
  ) : null;

  const showProgress = p.status === 'downloading' || p.status === 'paused';
  const pct = Math.round((p.progress ?? 0) * 100);

  return (
    <Card
      variant={p.selected ? 'selected' : 'outlined'}
      onPress={p.onPress}
      accessibilityLabel={`${p.name}, ${p.description}, ${formatSize(p.sizeMB)}`}
      className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text variant="h2" className="font-semibold">{p.name}</Text>
          <Text tone="muted">
            {p.description} · {formatSize(p.sizeMB)}
          </Text>
        </View>
        {badge}
      </View>
      {showProgress && (
        <View className="gap-2">
          <ProgressBar value={p.progress ?? 0} label={`${p.name} download`} />
          <View className="flex-row justify-between">
            <Text variant="small" tone="muted">
              {p.status === 'paused' ? 'Paused' : 'Downloading'} · {pct}%
            </Text>
            {p.minutesLeft != null && p.status === 'downloading' && (
              <Text variant="small" tone="muted">About {p.minutesLeft} min left</Text>
            )}
          </View>
        </View>
      )}
      {p.status === 'failed' && <Text variant="small" tone="danger">Download stopped. Tap to retry.</Text>}
    </Card>
  );
}
