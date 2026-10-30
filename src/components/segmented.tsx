import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (id: T) => void;
  options: Option<T>[];
  /** What the group switches, for screen readers ("Cards view"). */
  label: string;
};

/** Pill group for switching views (My cards | Practice) or modes (language). One is always selected. */
export function Segmented<T extends string>({ value, onChange, options, label }: Props<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row rounded-full bg-ink/5 p-1">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            className={`will-change-pressable min-h-11 items-center justify-center rounded-full px-4 ${selected ? 'bg-primary' : 'active:bg-ink/10'}`}>
            <Text
              variant="small"
              tone={selected ? 'paper' : 'muted'}
              className={selected ? 'font-semibold' : 'font-medium'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
