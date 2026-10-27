import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ChatBubble } from '@/components/chat-bubble';
import { Chip } from '@/components/chip';
import { Composer } from '@/components/composer';
import { Disclaimer } from '@/components/disclaimer';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEMO_CHAT } from '@/features/demo-data';
import { subject } from '@/llm/subjects/config';

// shortcut: follow-ups, explain levels and save-as-card are no-ops until features/chat and flashcards exist.
const noop = () => {};

export default function Chat() {
  const { q } = useLocalSearchParams<{ id: string; q?: string }>();
  const chat = DEMO_CHAT;

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        padded={false}
        footer={<Composer onSend={noop} placeholder="Ask a follow-up…" />}>
        <Header
          title={chat.title}
          bordered
          right={<Badge label={subject(chat.subject).short} />}
        />
        <Screen scroll edges={[]}>
          <View className="gap-4 pt-4">
            <ChatBubble role="user" content={q ?? chat.question} />
            <ChatBubble
              role="assistant"
              content={chat.answer}
              footer={
                <>
                  <View className="flex-row items-center gap-3 rounded-lg border border-ink/60 px-4 py-3">
                    <Text variant="h2" className="flex-1 font-bold">Answer: {chat.finalAnswer}</Text>
                    {chat.checked && (
                      <Badge
                        label="Checked"
                        status="success"
                        icon={<Icon ios="checkmark" android="check" size={14} className="text-success" />}
                      />
                    )}
                  </View>
                  <Text variant="label" className="mt-1">Check</Text>
                  <Text>{chat.check}</Text>
                </>
              }
            />

            <View className="flex-row flex-wrap items-center gap-3">
              <Text tone="muted">Source</Text>
              <Chip label={chat.source} icon={<Icon ios="book.closed" android="book" size={16} />} onPress={noop} />
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Chip label="Explain simpler" onPress={noop} />
              <Chip label="Give an example" onPress={noop} />
              <Chip label="In Filipino" onPress={noop} />
            </View>

            <View className="flex-row items-center gap-2">
              <Button
                label="Quiz me"
                size="lg"
                icon={<Icon ios="questionmark.circle" android="help" className="text-paper" />}
                onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: 'demo' } })}
              />
              <IconButton
                accessibilityLabel="Save as card"
                onPress={noop}
                icon={<Icon ios="bookmark" android="bookmark" size={24} />}
              />
            </View>

            <Disclaimer className="mt-2" />
          </View>
        </Screen>
      </Screen>
    </KeyboardAvoidingView>
  );
}
