import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { saveQuizResult } from '@/db/quiz';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { type CardDraft, SaveCardSheet } from '@/features/flashcards/components/SaveCardSheet';
import { makeQuiz, type QuizError } from '@/features/quiz/generate';
import type { QuizQuestion } from '@/features/quiz/services/parse';
import { useColor } from '@/hooks/use-color';
import type { SubjectId } from '@/llm/subjects/config';

const LETTERS = ['A', 'B', 'C', 'D'];

const ERRORS: Record<QuizError, string> = {
  invalid: 'This answer might be too short to quiz you on. Try again, or ask Lucid to explain more first.',
  'no-model': "Lucid's brain isn't downloaded on this phone yet.",
  load: "Lucid couldn't start. Close other apps to free memory, then try again.",
  stopped: 'The quiz was stopped.',
};

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

const choiceStyle: Record<ChoiceState, string> = {
  idle: 'border-transparent bg-ink/5 active:bg-ink/10',
  correct: 'border-success/60 bg-success/10',
  wrong: 'border-danger/60 bg-danger/10',
  dim: 'border-transparent bg-ink/5',
};

type QuizState = { status: 'loading' } | { status: 'error'; error: QuizError } | { status: 'ready'; questions: QuizQuestion[] };

/** Quiz me on a chat's last answer (`id` is the chat id). */
export default function Quiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const spinner = useColor('primary');
  // Opened from Chat, so the chat is usually in memory; otherwise read it from SQLite once.
  const [chat] = useState(() => {
    const store = useChat.getState();
    if (!store.chats[id] && user) store.open(user.uid, id);
    return useChat.getState().chats[id] ?? null;
  });
  const answer = chat?.messages.findLast((m) => m.role === 'assistant')?.content ?? '';
  const topic = chat?.messages.find((m) => m.role === 'user')?.content ?? 'Quiz';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QuizState>({ status: 'loading' });

  useEffect(() => {
    if (!answer) return;
    const run = makeQuiz(answer);
    let live = true;
    void run.done.then((r) => {
      if (live) setState('questions' in r ? { status: 'ready', questions: r.questions } : { status: 'error', error: r.error });
    });
    // Closing the quiz stops the model (AGENTS.md LLM rule 3).
    return () => {
      live = false;
      run.stop();
    };
  }, [answer, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt(attempt + 1);
  };

  if (!chat || !answer || state.status === 'error') {
    const error = state.status === 'error' ? state.error : 'invalid';
    return (
      <Screen
        footer={
          <View className="gap-3 px-4 pb-8 pt-3">
            <Button label="Back to answer" variant="secondary" size="lg" onPress={() => router.back()} />
            {answer && error !== 'no-model' && <Button label="Try again" size="lg" onPress={retry} />}
          </View>
        }>
        <Header back="close" title={`Quiz · ${topic}`} subtle />
        <EmptyState
          icon={
            <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-danger/10">
              <Icon name="CircleHelp" size={28} tone="danger" />
            </View>
          }
          title="Couldn't make a quiz"
          message={ERRORS[error]}
        />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Header back="close" title={`Quiz · ${topic}`} subtle />
        <View className="flex-1 items-center justify-center gap-3 px-4" accessibilityLiveRegion="polite">
          <ActivityIndicator color={spinner} size="large" />
          <Text variant="h3" className="text-center">
            Making your quiz…
          </Text>
          <Text tone="muted" className="text-center">
            Lucid is writing questions from this answer, on your phone.
          </Text>
        </View>
      </Screen>
    );
  }

  return <Questions questions={state.questions} topic={topic} subject={chat.subject} chatId={id} />;
}

function Questions({
  questions,
  topic,
  subject,
  chatId,
}: {
  questions: QuizQuestion[];
  topic: string;
  subject: SubjectId;
  chatId: string;
}) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const done = index >= questions.length;
  const q = questions[index];

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    if (i === q.correct) setScore(score + 1);
  };
  const next = () => {
    if (index === questions.length - 1 && user) {
      try {
        saveQuizResult(user.uid, { subject, chatId, score, total: questions.length });
      } catch (e) {
        // The score is still shown; it only misses the saved results.
        console.warn('Could not save quiz result', e instanceof Error ? e.message : e);
      }
    }
    setPicked(null);
    setIndex(index + 1);
  };

  const stateOf = (i: number): ChoiceState => {
    if (picked == null) return 'idle';
    if (i === q.correct) return 'correct';
    if (i === picked) return 'wrong';
    return 'dim';
  };

  return (
    <Screen
      padded={false}
      footer={
        <View className="flex-row gap-3 px-4 pb-8 pt-3">
          {done ? (
            <Button label="Done" size="lg" className="flex-1" onPress={() => router.back()} />
          ) : (
            <>
              <Button
                label={saved.has(index) ? 'Saved' : 'Save as card'}
                variant="secondary"
                size="lg"
                className="flex-1"
                disabled={picked == null || saved.has(index)}
                onPress={() =>
                  setDraft({ subject, front: q.question, back: `${q.choices[q.correct]}. ${q.why}`.trim(), chatId })
                }
              />
              <Button
                label={index === questions.length - 1 ? 'See score' : 'Next question'}
                size="lg"
                className="flex-1"
                disabled={picked == null}
                onPress={next}
              />
            </>
          )}
        </View>
      }>
      <Header
        back="close"
        title={`Quiz · ${topic}`}
        subtle
        right={
          !done && (
            <Text variant="small" tone="muted">
              {index + 1}/{questions.length}
            </Text>
          )
        }
      />
      <View
        className="flex-row gap-1 px-4 py-2"
        accessibilityLabel={`Question ${Math.min(index + 1, questions.length)} of ${questions.length}`}>
        {questions.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-success' : i === index ? 'bg-primary' : 'bg-ink/10'}`}
          />
        ))}
      </View>

      {done ? (
        <View className="flex-1 items-center justify-center gap-2 px-4">
          <Text variant="label">Your score</Text>
          <Text variant="display" className="text-center">
            {score} of {questions.length}
          </Text>
          <Text tone="muted" className="text-center">
            {score === questions.length ? 'Perfect! You got them all.' : 'Nice work. Review the ones you missed.'}
          </Text>
        </View>
      ) : (
        <Screen scroll edges={[]}>
          <View className="gap-1.5 pt-4">
            <Text variant="label">Question {index + 1}</Text>
            <Text variant="h2" accessibilityRole="header">
              {q.question}
            </Text>
            <View className="mt-4 gap-2.5">
              {q.choices.map((c, i) => {
                const s = stateOf(i);
                return (
                  <Pressable
                    key={c}
                    onPress={() => pick(i)}
                    disabled={picked != null}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: picked === i }}
                    accessibilityLabel={`${LETTERS[i]}: ${c}${s === 'correct' ? ', correct' : s === 'wrong' ? ', your answer, wrong' : ''}`}
                    className={`min-h-14 flex-row items-center gap-3 rounded-md border px-4 py-3 ${choiceStyle[s]}`}>
                    <Marker letter={LETTERS[i]} state={s} />
                    <Text tone={s === 'dim' ? 'muted' : 'ink'} className="flex-1">
                      {c}
                    </Text>
                    {s === 'wrong' && (
                      <Text variant="caption" tone="danger" className="font-semibold">
                        Your answer
                      </Text>
                    )}
                    {s === 'correct' && (
                      <Text variant="caption" tone="success" className="font-semibold">
                        Correct
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {picked != null && !!q.why && (
              <Card className="mt-4 gap-1 p-3">
                <Text variant="small" className="font-semibold">
                  Why?
                </Text>
                <Text variant="small" tone="muted">
                  {q.why}
                </Text>
              </Card>
            )}
          </View>
        </Screen>
      )}
      <SaveCardSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          setSaved(new Set(saved).add(index));
        }}
      />
    </Screen>
  );
}

function Marker({ letter, state }: { letter: string; state: ChoiceState }) {
  if (state === 'correct' || state === 'wrong') {
    return (
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${state === 'correct' ? 'bg-success' : 'bg-danger'}`}>
        <Icon name={state === 'correct' ? 'Check' : 'X'} size={16} tone="paper" />
      </View>
    );
  }
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full border border-ink/20">
      <Text variant="caption" tone="muted" className="font-semibold">
        {letter}
      </Text>
    </View>
  );
}
