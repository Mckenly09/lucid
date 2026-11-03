import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { saveQuizResult } from '@/db/quiz';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { type CardDraft, SaveCardSheet } from '@/features/flashcards/components/SaveCardSheet';
import { QuizQuestion } from '@/features/quiz/components/QuizQuestion';
import { makeQuiz, type QuizError } from '@/features/quiz/generate';
import type { QuizQuestion as Question } from '@/features/quiz/services/parse';
import { canQuiz, QUIZ_COUNT } from '@/llm/prompts';
import type { SubjectId } from '@/llm/subjects/config';

const ERRORS: Record<QuizError, string> = {
  invalid: 'This answer might be too short to quiz you on. Try again, or ask Lucid to explain more first.',
  'no-model': "Lucid's brain isn't downloaded on this phone yet.",
  load: "Lucid couldn't start. Close other apps to free memory, then try again.",
  stopped: 'The quiz was stopped.',
};

type QuizState = { status: 'loading' } | { status: 'error'; error: QuizError } | { status: 'ready'; questions: Question[] };

/** Quiz me on a chat's last answer (`id` is the chat id). */
export default function Quiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
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
  const [written, setWritten] = useState(0);

  useEffect(() => {
    if (!canQuiz(answer)) return;
    let live = true;
    const run = makeQuiz(answer, (n) => live && setWritten(n));
    void run.done.then((r) => {
      if (!live) return;
      setState('questions' in r ? { status: 'ready', questions: r.questions } : { status: 'error', error: r.error });
    });
    // Closing the quiz stops the model (AGENTS.md LLM rule 3).
    return () => {
      live = false;
      run.stop();
    };
  }, [answer, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setWritten(0);
    setAttempt(attempt + 1);
  };

  if (!chat || !canQuiz(answer) || state.status === 'error') {
    const error = state.status === 'error' ? state.error : 'invalid';
    // Known before the model runs, so there's nothing to retry.
    const tooShort = !!answer && !canQuiz(answer);
    return (
      <Screen
        footer={
          <View className="gap-3 px-4 pb-8 pt-3">
            <Button label="Back to answer" variant="secondary" size="lg" onPress={() => router.back()} />
            {canQuiz(answer) && error !== 'no-model' && <Button label="Try again" size="lg" onPress={retry} />}
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
          message={tooShort ? 'This answer is too short to quiz you on. Ask Lucid to explain more first.' : ERRORS[error]}
        />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Header back="close" title={`Quiz · ${topic}`} subtle />
        <Making written={Math.min(written, QUIZ_COUNT)} />
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
  questions: Question[];
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
          <QuizQuestion q={q} index={index} picked={picked} onPick={pick} />
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

/** 0 → 1 → 0 forever; stays at 0 under Reduce Motion. */
function usePulse() {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);
  return t;
}

/** Loading: real progress (one bar segment per question the model has started) over a faded preview of a question card. */
function Making({ written }: { written: number }) {
  const t = usePulse();
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.08 }] }));
  const step = written === 0 ? 'Reading your answer…' : `Writing question ${written} of ${QUIZ_COUNT}…`;
  return (
    <View className="flex-1">
      <View
        className="flex-row gap-1 py-2"
        accessibilityRole="progressbar"
        accessibilityLabel={step}
        accessibilityValue={{ min: 0, max: QUIZ_COUNT, now: written }}>
        {Array.from({ length: QUIZ_COUNT }, (_, i) => (
          <View key={i} className={`h-1.5 flex-1 rounded-full ${i < written ? 'bg-primary' : 'bg-ink/10'}`} />
        ))}
      </View>
      <View className="items-center gap-2 pt-8">
        <Animated.View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-primary/10" style={ring}>
          <Icon name="Pencil" size={24} tone="primary" />
        </Animated.View>
        <Text variant="h3" className="text-center">
          Making your quiz…
        </Text>
        <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
          {step}
        </Text>
      </View>
      <PreviewCard t={t} />
      <Text variant="small" tone="muted" className="mt-6 text-center">
        Made on your phone, so it works offline.
      </Text>
    </View>
  );
}

const PREVIEW_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/5', 'w-2/5'];

/** A faded quiz question that breathes while the real one is written. Decoration only, hidden from screen readers. */
function PreviewCard({ t }: { t: SharedValue<number> }) {
  const breathe = useAnimatedStyle(() => ({ opacity: 0.5 + t.value * 0.5 }));
  return (
    <Animated.View
      className="mt-8 gap-3 rounded-lg border border-ink/10 p-4"
      style={breathe}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <View className="h-3 w-1/4 rounded-full bg-ink/10" />
      <View className="h-4 w-11/12 rounded-full bg-ink/10" />
      <View className="h-4 w-3/4 rounded-full bg-ink/10" />
      <View className="mt-1 gap-2">
        {PREVIEW_WIDTHS.map((w) => (
          <View key={w} className="min-h-14 flex-row items-center gap-3 rounded-md bg-ink/5 px-4">
            <View className="h-7 w-7 rounded-full border border-ink/20" />
            <View className={`h-3 rounded-full bg-ink/10 ${w}`} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
