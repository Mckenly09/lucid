import { type ComponentRef, type Ref, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { useColor } from '@/hooks/use-color';

type Props = {
  onSend: (text: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
};

export function Composer({ onSend, onStop, isGenerating, placeholder = 'Ask anything…', disabled, inputRef }: Props) {
  const [text, setText] = useState('');
  const placeholderColor = useColor('default');
  const send = () => {
    const q = text.trim();
    if (!q) return;
    onSend(q);
    setText('');
  };

  return (
    <View className="flex-row items-end gap-2 border-t border-ink/10 bg-paper px-4 py-3">
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline
        textAlignVertical="center"
        editable={!disabled}
        accessibilityLabel="Your question"
        className="max-h-32 min-h-12 flex-1 rounded-full border border-ink/10 bg-ink/5 px-6 py-3 font-sans text-body text-ink"
      />
      {isGenerating ? (
        <IconButton
          variant="filled"
          accessibilityLabel="Stop answer"
          onPress={() => onStop?.()}
          className="h-12 w-12"
          icon={<Icon name="Square" size={20} tone="paper" fill />}
        />
      ) : (
        <IconButton
          variant="filled"
          accessibilityLabel="Send question"
          onPress={send}
          disabled={disabled || !text.trim()}
          className="h-12 w-12"
          icon={<Icon name="ArrowUp" size={20} tone="paper" />}
        />
      )}
    </View>
  );
}
