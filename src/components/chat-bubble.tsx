import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MarkdownAnswer } from '@/components/markdown-answer';
import { Text } from '@/components/text';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  /** Extra content under an assistant answer (checked answer box). */
  footer?: ReactNode;
};

export function ChatBubble({ role, content, footer }: Props) {
  if (role === 'user') {
    return (
      <View className="max-w-[85%] self-end rounded-lg bg-primary px-4 py-3">
        <Text tone="paper" className="text-h3">{content}</Text>
      </View>
    );
  }
  return (
    <View className="w-full gap-3 self-start rounded-lg bg-ink/5 px-4 py-4">
      <MarkdownAnswer content={content} />
      {footer}
    </View>
  );
}
