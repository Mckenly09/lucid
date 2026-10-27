import { Pressable } from 'react-native';

import { Text } from '@/components/text';

type Props = { code: string; name: string; onPress: () => void };

/** Home subject grid: code over name. Lay out 3 per row with `flex-1` siblings and `gap-2`. */
export function SubjectTile({ code, name, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ask about ${name}`}
      className="min-h-11 flex-1 gap-1 rounded-md bg-ink/5 p-3 active:bg-ink/10">
      <Text variant="caption" tone="primary" className="font-bold">
        {code}
      </Text>
      <Text variant="small" className="font-semibold" numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}
