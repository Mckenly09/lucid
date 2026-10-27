import { View } from 'react-native';

import { Chip } from '@/components/chip';

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (id: T) => void;
  options: Option<T>[];
};

/** Wrapping row of subject chips (Ask) or filter chips (Cards). */
export function SubjectPicker<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={o.id === value} onPress={() => onChange(o.id)} />
      ))}
    </View>
  );
}
