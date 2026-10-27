import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

/** Under an answer that used reference notes: where they came from (AGENTS.md LLM rule 8, design 06). */
export function SourceChips({ sources }: { sources: string[] }) {
  return (
    <View
      className="flex-row flex-wrap items-center gap-2"
      accessible
      accessibilityLabel={`Sources: ${sources.join(', ')}`}>
      <Text variant="caption" tone="muted">
        Source
      </Text>
      {sources.map((s) => (
        <View key={s} className="min-h-7 flex-row items-center gap-1 rounded-full border border-ink/10 px-2">
          <Icon name="Book" size={14} tone="muted" />
          <Text variant="caption" numberOfLines={1}>
            {s}
          </Text>
        </View>
      ))}
    </View>
  );
}
