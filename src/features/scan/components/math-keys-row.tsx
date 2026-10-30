import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';

import { MATH_KEYS, type MathKey } from '../math-keys';

/** Symbols OCR misses (stacked fractions, roots, powers), one tap each. Wraps at large font sizes. */
export function MathKeysRow({ onKey }: { onKey: (key: MathKey) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityLabel="Math symbols">
      {MATH_KEYS.map((k) => (
        <Pressable
          key={k.label}
          onPress={() => onKey(k)}
          accessibilityRole="button"
          accessibilityLabel={`Insert ${k.name}`}
          className="min-h-11 min-w-11 items-center justify-center rounded-sm bg-ink/5 px-3 active:bg-ink/10">
          <Text className="font-medium">{k.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
