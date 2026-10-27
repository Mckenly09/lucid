import { useState } from 'react';
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
};

export function Composer({ onSend, onStop, isGenerating, placeholder = 'Ask anything…', disabled }: Props) {
  const [text, setText] = useState('');
  const placeholderColor = useColor('default');
  const send = () => {
    const q = text.trim();
    if (!q) return;
    onSend(q);
    setText('');
  };

  return (
    <View className="flex-row items-end gap-3 border-t border-ink/10 bg-paper px-4 py-3">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline
        editable={!disabled}
        accessibilityLabel="Your question"
        className="max-h-32 min-h-14 flex-1 rounded-full border border-ink/10 bg-ink/5 px-5 py-4 font-sans text-body text-ink"
      />
      {isGenerating ? (
        <IconButton
          variant="filled"
          accessibilityLabel="Stop answer"
          onPress={() => onStop?.()}
          className="h-14 w-14"
          icon={<Icon ios="stop.fill" android="stop" size={24} className="text-paper" />}
        />
      ) : (
        <IconButton
          variant="filled"
          accessibilityLabel="Send question"
          onPress={send}
          disabled={disabled || !text.trim()}
          className="h-14 w-14"
          icon={<Icon ios="arrow.up" android="arrow_upward" size={24} className="text-paper" />}
        />
      )}
    </View>
  );
}
