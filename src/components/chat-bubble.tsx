import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { MarkdownAnswer } from '@/components/markdown-answer';
import { Text } from '@/components/text';
import { TypingDots } from '@/components/typing-dots';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  /** Extra content under an assistant answer (checked answer box). */
  footer?: ReactNode;
  /** User bubbles only: long-press opens Copy / Edit. */
  onLongPress?: () => void;
};

export function ChatBubble({ role, content, footer, onLongPress }: Props) {
  if (role === 'user') {
    return (
      <Pressable
        onLongPress={onLongPress}
        disabled={!onLongPress}
        accessibilityRole="button"
        accessibilityLabel={content}
        accessibilityHint={onLongPress ? 'Long-press to copy or edit your question' : undefined}
        className="max-w-[85%] self-end rounded-lg rounded-br-sm bg-primary px-4 py-3 active:bg-primary/90">
        <Text tone="paper">{content}</Text>
      </Pressable>
    );
  }
  // Generating, no words yet: a small bubble with typing dots instead of an empty full-width one.
  if (!content) {
    return (
      <View className="self-start rounded-lg rounded-bl-sm bg-ink/5 px-4 py-3">
        <TypingDots />
      </View>
    );
  }
  return (
    <View className="w-full gap-3 self-start rounded-lg rounded-bl-sm bg-ink/5 p-4">
      <MarkdownAnswer content={content} />
      {footer}
    </View>
  );
}
