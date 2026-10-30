import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import type { TopicStats } from '@/db/practice';

/** A practice topic: name, last score ("Last: 6/10" or "New"), mastery bar, play. The whole row starts a session. */
export function TopicRow({ name, stats, onPress }: { name: string; stats?: TopicStats; onPress: () => void }) {
  const last = stats ? `Last: ${stats.last.score}/${stats.last.total}` : 'New';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Practice ${name}. ${stats ? `${last}, ${Math.round(stats.mastery * 100)}% mastered` : 'Not practiced yet'}`}
      className="min-h-11 flex-row items-center gap-4 border-b border-ink/10 py-4 active:bg-ink/5">
      <View className="flex-1 gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <Text variant="h3" className="flex-1">
            {name}
          </Text>
          <Text variant="small" tone="muted">
            {last}
          </Text>
        </View>
        <ProgressBar value={stats?.mastery ?? 0} label={`${name} mastery`} className="h-1" />
      </View>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-ink/5">
        <Icon name="Play" size={18} fill />
      </View>
    </Pressable>
  );
}
