import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { ChatBubble } from '@/components/chat-bubble';
import { Chip } from '@/components/chip';
import { Composer } from '@/components/composer';
import { Disclaimer } from '@/components/disclaimer';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useAuth } from '@/features/auth/useAuth';
import { type ChatError, useChat } from '@/features/chat/store';
import { EXPLAIN_LABEL, type ExplainKind } from '@/llm/prompts';
import { subject } from '@/llm/subjects/config';
import { isFilipino } from '@/llm/subjects/detect';

// shortcut: copy and save-as-card are no-ops until those v1 features are built.
const noop = () => {};

const ERRORS: Record<ChatError, string> = {
  'no-model': "Lucid's brain isn't downloaded on this phone yet.",
  load: "Lucid couldn't start. Close other apps to free memory, then try again.",
  generate: 'Something went wrong while answering. Please try again.',
};

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const chat = useChat((s) => s.chats[id]);
  const busy = useChat((s) => s.activeId === id);
  const status = useChat((s) => s.status);
  const error = useChat((s) => (s.error?.chatId === id ? s.error.kind : null));
  const { ask, explain, retry, stop } = useChat.getState();
  const list = useRef<FlatList>(null);

  // Chats from History or Home load from SQLite (a quick sync read, once per screen); a new one is already in memory.
  const [found] = useState(() => !!user && useChat.getState().open(user.uid, id));

  // Never leave an answer running on a screen nobody is looking at (AGENTS.md LLM rule 3).
  useEffect(
    () => () => {
      if (useChat.getState().activeId === id) useChat.getState().stop();
    },
    [id],
  );

  if (!chat || !found) {
    return (
      <Screen>
        <Header />
        <EmptyState
          title="Chat not found"
          message="It may have been deleted, or it belongs to another account."
          action={<Button label="Ask a question" onPress={() => router.replace('/ask')} />}
        />
      </Screen>
    );
  }

  const first = chat.messages.find((m) => m.role === 'user')?.content ?? 'New chat';
  const last = chat.messages[chat.messages.length - 1];
  const answered = !busy && last?.role === 'assistant';
  // The language chip offers the other language (docs/ui.md ExplainChips).
  const chips: ExplainKind[] = ['simpler', 'example', answered && isFilipino(last.content) ? 'english' : 'filipino'];

  return (
    <Screen
      padded={false}
      footer={
        <Composer
          onSend={(q) => void ask(id, q)}
          onStop={stop}
          isGenerating={busy}
          disabled={busy && status === 'loading'}
          placeholder="Ask a follow-up…"
        />
      }>
      <Header title={first} bordered right={<Badge label={subject(chat.subject).short} status="primary" />} />
      <FlatList
        ref={list}
        data={chat.messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
        contentContainerClassName="gap-4 p-4"
        keyboardShouldPersistTaps="handled"
        // Follow the answer as it streams in.
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          <View className="gap-4">
            {busy && status === 'loading' && (
              <View className="self-start rounded-lg rounded-bl-sm bg-ink/5 p-4" accessibilityLiveRegion="polite">
                <Text tone="muted">Starting Lucid… this takes a few seconds the first time.</Text>
              </View>
            )}
            {error && (
              <Banner
                status="danger"
                message={ERRORS[error]}
                icon={<Icon name="TriangleAlert" size={22} tone="danger" />}
              />
            )}
            {error && error !== 'no-model' && (
              <Button label="Try again" variant="secondary" onPress={() => retry(id)} className="self-start" />
            )}
            {answered && (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {chips.map((kind) => (
                    <Chip key={kind} label={EXPLAIN_LABEL[kind]} onPress={() => void explain(id, kind)} />
                  ))}
                </View>
                <View className="flex-row items-center gap-2">
                  <Button
                    label="Quiz me"
                    icon={<Icon name="CircleHelp" size={20} tone="paper" />}
                    onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: 'demo' } })}
                  />
                  <IconButton
                    accessibilityLabel="Copy answer"
                    onPress={noop}
                    icon={<Icon name="Copy" size={20} tone="muted" />}
                  />
                  <IconButton
                    accessibilityLabel="Save as card"
                    onPress={noop}
                    icon={<Icon name="Bookmark" size={20} tone="muted" />}
                  />
                </View>
              </>
            )}
            <Disclaimer />
          </View>
        }
      />
    </Screen>
  );
}
