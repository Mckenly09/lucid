import { type ComponentRef, type ReactNode, type Ref, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { useColor } from '@/hooks/use-color';

type Props = Omit<TextInputProps, 'className' | 'secureTextEntry' | 'placeholderTextColor'> & {
  label: string;
  /** Right of the label, e.g. a "Forgot password?" link. */
  labelRight?: ReactNode;
  /** Hides the text and adds a show/hide eye button. */
  password?: boolean;
  /** Under the field, e.g. password rules. */
  children?: ReactNode;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
};

/** Labelled text input (auth forms): filled box, brighter border while focused, optional show/hide for passwords. */
export function TextField({ label, labelRight, password, children, inputRef, onFocus, onBlur, ...input }: Props) {
  const placeholder = useColor('default');
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="small" className="font-medium">
          {label}
        </Text>
        {labelRight}
      </View>
      <View className={`min-h-13 flex-row items-center rounded-sm border bg-ink/5 ${focused ? 'border-ink/60' : 'border-ink/10'}`}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={placeholder}
          secureTextEntry={password && !shown}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="min-h-13 flex-1 px-4 font-sans text-body text-ink"
          {...input}
        />
        {password && (
          <IconButton
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            onPress={() => setShown(!shown)}
            icon={<Icon name={shown ? 'EyeOff' : 'Eye'} size={20} tone="muted" />}
          />
        )}
      </View>
      {children}
    </View>
  );
}
