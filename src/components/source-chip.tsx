import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

type Props = { sources: string[]; onPress: (source: string) => void };

/** Under an answer that used reference notes: where they came from (AGENTS.md LLM rule 8, design 06). Tap a chip for details. */
export function SourceChips({ sources, onPress }: Props) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text variant="caption" tone="muted">
        Source
      </Text>
      {sources.map((s) => (
        <Pressable
          key={s}
          onPress={() => onPress(s)}
          accessibilityRole="button"
          accessibilityLabel={`Source: ${s}`}
          accessibilityHint="Shows where this came from"
          // 28px chip + 8px each side = 44px touch target.
          hitSlop={8}
          // shrink: a long source name wraps the chip to its own line and ends in "…" instead of running off screen.
          className="min-h-7 shrink flex-row items-center gap-1 rounded-full border border-ink/10 px-2 active:bg-ink/5">
          <Icon name="Book" size={14} tone="muted" />
          <Text variant="caption" numberOfLines={1} className="shrink">
            {s}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
