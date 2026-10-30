import * as Clipboard from 'expo-clipboard';
import { Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Linking, Platform, View } from 'react-native';

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
import { formatSize } from '@/components/model-card';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { SourceChips } from '@/components/source-chip';
import { Text } from '@/components/text';
import { TypingDots } from '@/components/typing-dots';
import { useAuth } from '@/features/auth/useAuth';
import { type ChatError, useChat } from '@/features/chat/store';
import { sourceDetails } from '@/features/knowledge/retrieve';
import { ChoiceSheet } from '@/features/settings/components/ChoiceSheet';
import { type CardDraft, SaveCardSheet } from '@/features/flashcards/components/SaveCardSheet';
import { shortenAnswer } from '@/features/flashcards/services/shorten';
import { useModels } from '@/features/models/store';
import { LimitSheet } from '@/features/plus/LimitSheet';
import { useDailyLimit, usePlus } from '@/features/plus/usePlus';
import { VoiceSheet } from '@/features/voice/components/voice-sheet';
import { canQuiz, EXPLAIN_LABEL, type ExplainKind } from '@/llm/prompts';
import { subject, SUBJECTS } from '@/llm/subjects/config';
import { isFilipino } from '@/llm/subjects/detect';

const MB = 1024 ** 2;
const LOW_STORAGE_BYTES = 500 * MB;
const EXPLAIN_LABELS = new Set(Object.values(EXPLAIN_LABEL));
const SUBJECT_OPTIONS = SUBJECTS.map((s) => ({ id: s.id, label: s.short }));

const ERRORS: Record<ChatError, { title?: string; message: string }> = {
  'no-model': { message: "Lucid's brain isn't downloaded on this phone yet." },
  load: {
    title: "Lucid couldn't start the AI",
    message: 'Your phone may be low on memory. Close other apps, then try again. Your question is saved.',
  },
  generate: { message: 'Something went wrong while answering. Please try again.' },
};

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const chat = useChat((s) => s.chats[id]);
  const busy = useChat((s) => s.activeId === id);
  const status = useChat((s) => s.status);
  const error = useChat((s) => (s.error?.chatId === id ? s.error.kind : null));
  const { ask, explain, retry, stop, setSubject } = useChat.getState();
  const list = useRef<FlatList>(null);
  const installedId = useModels((s) => s.installedId);
  const { isPlus } = usePlus();
  const limit = useDailyLimit();
  // Read once per screen: the model needs free space to run well, and a full phone slows everything down.
  const [freeBytes] = useState(() => Paths.availableDiskSpace);
  const lowStorage = freeBytes < LOW_STORAGE_BYTES;
  const [draft, setDraft] = useState<CardDraft | null>(null);
  // The answer (by message count) saved as a card, so the bookmark shows it.
  const [savedAt, setSavedAt] = useState(-1);
  const [copiedAt, setCopiedAt] = useState(-1);
  const [pickingSubject, setPickingSubject] = useState(false);
  const [listening, setListening] = useState(false);
  // The question long-pressed (Copy / Edit sheet), and the text Edit put back in the input box.
  const [question, setQuestion] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ text: string; at: number } | null>(null);
  const [source, setSource] = useState<ReturnType<typeof sourceDetails> | null>(null);

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
  const saved = savedAt === chat.messages.length;
  const copied = copiedAt === chat.messages.length;

  const copy = async () => {
    await Clipboard.setStringAsync(last.content);
    setCopiedAt(chat.messages.length);
    AccessibilityInfo.announceForAccessibility('Answer copied');
  };

  const copyQuestion = async (text: string) => {
    setQuestion(null);
    await Clipboard.setStringAsync(text);
    AccessibilityInfo.announceForAccessibility('Question copied');
  };

  const openSaveCard = () => {
    // The front is the student's own question, not an "Explain simpler" follow-up.
    const question =
      [...chat.messages].reverse().find((m) => m.role === 'user' && !EXPLAIN_LABELS.has(m.content))?.content ?? first;
    const { text, shortened } = shortenAnswer(last.content);
    setDraft({ subject: chat.subject, front: question, back: text, chatId: id, shortened });
  };

  return (
    <Screen
      padded={false}
      footer={
        <Composer
          // A new key refills the box when Edit is tapped again.
          key={editing?.at}
          initialText={editing?.text}
          onSend={(q) => void ask(id, q)}
          onStop={stop}
          isGenerating={busy}
          disabled={busy && status === 'loading'}
          placeholder="Ask a follow-up…"
          onCamera={() => router.push({ pathname: '/scan', params: { chatId: id } })}
          onMic={() => (isPlus ? setListening(true) : router.push('/plus'))}
        />
      }>
      <Header title={first} bordered right={
          <Badge
            label={subject(chat.subject).short}
            status="primary"
            onPress={() => setPickingSubject(true)}
            accessibilityLabel={`Subject: ${subject(chat.subject).short}. Change subject`}
          />
        } />
      <FlatList
        ref={list}
        data={chat.messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <ChatBubble
            role={item.role}
            content={item.content}
            footer={item.sources?.length ? <SourceChips sources={item.sources} onPress={(s) => setSource(sourceDetails(s))} /> : undefined}
            onLongPress={item.role === 'user' ? () => setQuestion(item.content) : undefined}
          />
        )}
        contentContainerClassName="gap-4 p-4"
        keyboardShouldPersistTaps="handled"
        // Follow the answer as it streams in.
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          <View className="gap-4">
            {busy && status === 'loading' && (
              <View className="self-start gap-2 rounded-lg rounded-bl-sm bg-ink/5 p-4" accessibilityLiveRegion="polite">
                <TypingDots />
                <Text tone="muted">Starting Lucid… this takes a few seconds the first time.</Text>
              </View>
            )}
            {error && (
              <Banner
                status="danger"
                title={ERRORS[error].title}
                message={ERRORS[error].message}
                icon={<Icon name="CircleAlert" size={22} tone="danger" />}
              />
            )}
            {error && error !== 'no-model' && (
              <View className="flex-row gap-2">
                <Button label="Try again" variant="secondary" onPress={() => retry(id)} />
                {/* The bigger model failing to load on this phone: offer the smaller one (AGENTS.md LLM rule 5). */}
                {error === 'load' && installedId === 'plus' && (
                  <Button label="Use Lucid Lite" variant="ghost" onPress={() => router.push('/settings/model')} />
                )}
              </View>
            )}
            {lowStorage && (
              <Banner
                status="warning"
                title="Low storage"
                message={`Only ${formatSize(freeBytes / MB)} left. Lucid may run slowly.`}
                icon={<Icon name="TriangleAlert" size={22} tone="warning" />}
              />
            )}
            {/* Android only: iOS has no public link to its storage settings (design 05c). */}
            {lowStorage && Platform.OS === 'android' && (
              <Button
                label="Free up space"
                variant="ghost"
                onPress={() => void Linking.sendIntent('android.settings.INTERNAL_STORAGE_SETTINGS').catch(() => {})}
              />
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
                    disabled={!canQuiz(last.content)}
                    onPress={() => limit.run(() => router.push({ pathname: '/quiz/[id]', params: { id } }))}
                  />
                  <IconButton
                    accessibilityLabel={copied ? 'Answer copied' : 'Copy answer'}
                    onPress={() => void copy()}
                    icon={<Icon name={copied ? 'Check' : 'Copy'} size={20} tone={copied ? 'success' : 'muted'} />}
                  />
                  <IconButton
                    accessibilityLabel={saved ? 'Saved as card' : 'Save as card'}
                    onPress={openSaveCard}
                    disabled={saved}
                    icon={<Icon name={saved ? 'BookmarkCheck' : 'Bookmark'} size={20} tone={saved ? 'success' : 'muted'} />}
                  />
                </View>
                {!canQuiz(last.content) && (
                  <Text variant="small" tone="muted">
                    Too short to quiz. Ask Lucid to explain more first.
                  </Text>
                )}
              </>
            )}
            <Disclaimer />
          </View>
        }
      />
      <SaveCardSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          setSavedAt(chat.messages.length);
        }}
      />
      {/* Option b (todo.md): the new subject applies to follow-up questions; earlier answers stay. */}
      <ChoiceSheet
        title="Subject for follow-ups"
        visible={pickingSubject}
        value={chat.subject}
        options={SUBJECT_OPTIONS}
        onPick={(s) => setSubject(id, s)}
        onClose={() => setPickingSubject(false)}
      />
      <Sheet visible={!!question} onClose={() => setQuestion(null)} title="Your question">
        {question && (
          <View className="gap-3 pt-1">
            <Text tone="muted" numberOfLines={3}>
              {question}
            </Text>
            <Button
              label="Copy question"
              variant="secondary"
              size="lg"
              icon={<Icon name="Copy" size={20} tone="primary" />}
              onPress={() => void copyQuestion(question)}
            />
            {/* Edit sends as a new follow-up; earlier answers stay. */}
            <Button
              label="Edit question"
              variant="secondary"
              size="lg"
              icon={<Icon name="Pencil" size={20} tone="primary" />}
              disabled={busy}
              onPress={() => {
                setEditing({ text: question, at: Date.now() });
                setQuestion(null);
              }}
            />
          </View>
        )}
      </Sheet>
      {/* packs.md §4: a chip opens the note's title and the pack's license and attribution. */}
      <Sheet visible={!!source} onClose={() => setSource(null)} title={source?.title}>
        {source && (
          <View className="gap-3 pt-1">
            {source.mine ? (
              <Text tone="muted">From your own notes in My packs.</Text>
            ) : source.pack ? (
              <>
                <Text variant="small" tone="muted">
                  {source.pack.name}
                </Text>
                <View className="gap-1">
                  <Text variant="label">License</Text>
                  <Text>{source.pack.license}</Text>
                </View>
                <View className="gap-1">
                  <Text variant="label">Source</Text>
                  <Text variant="small" tone="muted">
                    {source.pack.attribution}
                  </Text>
                </View>
              </>
            ) : (
              <Text tone="muted">This pack is no longer on your phone.</Text>
            )}
            <Button label="Close" variant="secondary" onPress={() => setSource(null)} />
          </View>
        )}
      </Sheet>
      <VoiceSheet visible={listening} onClose={() => setListening(false)} onText={(q) => void ask(id, q)} />
      <LimitSheet visible={limit.blocked} onClose={limit.dismiss} />
    </Screen>
  );
}
