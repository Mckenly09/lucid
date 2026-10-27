import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';

type Props<T extends string> = {
  title: string;
  visible: boolean;
  value: T;
  options: { id: T; label: string }[];
  onPick: (id: T) => void;
  onClose: () => void;
};

/** Pick one option (default subject, answer language, appearance); closes on pick. */
export function ChoiceSheet<T extends string>({ title, visible, value, options, onPick, onClose }: Props<T>) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View accessibilityRole="radiogroup" className="pb-2 pt-1">
        {options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              onPick(o.id);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: o.id === value }}
            className="min-h-12 flex-row items-center justify-between border-b border-ink/10 active:bg-ink/5">
            <Text className={o.id === value ? 'font-semibold' : ''}>{o.label}</Text>
            {o.id === value && <Icon name="Check" size={20} tone="primary" />}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
