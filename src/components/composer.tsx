import { type ComponentRef, type RefObject, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { useColor } from '@/hooks/use-color';

type Props = {
  onSend: (text: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
  /** Starts the box with this text, focused (Edit question). Change the Composer's `key` to fill it again. */
  initialText?: string;
};

export function Composer({
  onSend,
  onStop,
  isGenerating,
  placeholder = 'Ask anything…',
  disabled,
  inputRef,
  initialText = '',
}: Props) {
  const [text, setText] = useState(initialText);
  const placeholderColor = useColor('default');
  const own = useRef<ComponentRef<typeof TextInput>>(null);
  const input = inputRef ?? own;
  const send = () => {
    const q = text.trim();
    if (!q) return;
    onSend(q);
    setText('');
  };

  return (
    <View className="flex-row items-end gap-2 border-t border-ink/10 bg-paper px-4 py-3">
      {/* Padding lives on the wrapper so typed text clears the rounded edge; tapping the padding still focuses the input. */}
      <Pressable
        onPress={() => input.current?.focus()}
        accessible={false}
        className="min-h-12 flex-1 justify-center rounded-full border border-ink/10 bg-ink/5 px-6">
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          multiline
          textAlignVertical="center"
          editable={!disabled}
          autoFocus={!!initialText}
          accessibilityLabel="Your question"
          className="max-h-32 py-3 font-sans text-body text-ink"
        />
      </Pressable>
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
