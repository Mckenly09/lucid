import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { cachedQuestions, cacheQuestions, savePracticeSession } from '@/db/practice';
import { useAuth } from '@/features/auth/useAuth';
import { topicChunks } from '@/features/knowledge/pack-files';
import { countStart } from '@/features/plus/usePlus';
import { type Chunk, runPractice, SESSION_SIZE } from '@/features/practice/generate';
import { usePractice } from '@/features/practice/store';
import { packKey, type PracticeTopic } from '@/features/practice/topics';
import { QuizQuestion } from '@/features/quiz/components/QuizQuestion';
import type { QuizError } from '@/features/quiz/generate';
import { type QuizQuestion as Question, shuffle } from '@/features/quiz/services/parse';
import { useColor } from '@/hooks/use-color';

const ERRORS: Record<QuizError, string> = {
  invalid: "Lucid couldn't make questions from this topic's notes. Try again, or pick another topic.",
  'no-model': "Lucid's brain isn't downloaded on this phone yet.",
  load: "Lucid couldn't start. Close other apps to free memory, then try again.",
  stopped: 'Practice was stopped.',
};

/** A topic's chunks from every pack that has it, a new random pick each call. */
function picker(topic: PracticeTopic) {
  return (limit: number): Chunk[] => {
    const all = topic.packs.flatMap((p) => {
      try {
        return topicChunks(p, topic.code, limit);
      } catch {
        return [];
      }
    });
    return shuffle(all).slice(0, limit);
  };
}

/** Practice session (v2.md §3): 10 questions on the Quiz screen, made a batch at a time while the student answers. */
export default function PracticeSession() {
  const [topic] = useState(() => usePractice.getState().topic);
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [outcome, setOutcome] = useState<{ total: number } | { error: QuizError } | null>(null);
  const [written, setWritten] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(0);
  const spinner = useColor('ink');
  const uid = user?.uid;
  // Once per session, also across "Try again" after a partial failure.
  const counted = useRef(false);

  useEffect(() => {
    if (!topic) return;
    let live = true;
    const key = packKey(topic);
    let cached: Question[] = [];
    try {
      cached = cachedQuestions(topic.code, key);
    } catch (e) {
      console.warn('Could not read cached questions', e instanceof Error ? e.message : e);
    }
    const run = runPractice({
      cached,
      pickChunks: picker(topic),
      onQuestion: (q) => {
        if (!live) return;
        setQuestions((qs) => [...qs, q]);
        // The first question means the session works: only then does it count toward the free daily limit.
        if (!counted.current && uid) {
          counted.current = true;
          countStart(uid);
        }
      },
      onFresh: (qs) => {
        try {
          cacheQuestions(topic.code, key, qs);
        } catch (e) {
          console.warn('Could not cache questions', e instanceof Error ? e.message : e);
        }
      },
      onProgress: (n) => live && setWritten(n),
    });
    void run.done.then((r) => live && setOutcome(r));
    // Leaving stops the model (AGENTS.md LLM rule 3).
    return () => {
      live = false;
      run.stop();
    };
  }, [topic, attempt, uid]);

  if (!topic) {
    return (
      <Screen>
        <Header back="close" title="Practice" subtle />
        <EmptyState title="Pick a topic" message="Open Cards → Practice and choose a topic to start." />
      </Screen>
    );
  }

  const title = `Practice · ${topic.name}`;
  const making = outcome === null;
  const total = outcome && 'total' in outcome ? outcome.total : SESSION_SIZE;
  const q = questions[index];

  if (!q && outcome && 'error' in outcome) {
    return (
      <Screen
        footer={
          <View className="flex-row gap-3 px-4 pb-8 pt-3">
            <Button
              label="Other topics"
              variant="secondary"
              size="lg"
              className="flex-1"
              onPress={() => router.back()}
            />
            <Button
              label="Try again"
              size="lg"
              className="flex-1"
              onPress={() => {
                setOutcome(null);
                setAttempt(attempt + 1);
              }}
            />
          </View>
        }>
        <Header back="close" title={title} subtle />
        <EmptyState
          icon={
            <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-danger/10">
              <Icon name="CircleHelp" size={28} tone="danger" />
            </View>
          }
          title="Couldn't make questions"
          message={ERRORS[outcome.error]}
        />
      </Screen>
    );
  }

  if (!q) {
    return (
      <Screen>
        <Header back="close" title={title} subtle />
        <View className="flex-1 items-center justify-center gap-3 px-4">
          <ActivityIndicator color={spinner} />
          <Text variant="h3" className="text-center">
            Making questions…
          </Text>
          <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
            {written ? `Writing question ${written}…` : 'Reading your subject pack…'}
          </Text>
          <Text variant="small" tone="muted" className="mt-6 text-center">
            Made on your phone, so it works offline.
          </Text>
        </View>
      </Screen>
    );
  }

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    setAnswers([...answers, i]);
  };
  const last = index === questions.length - 1 && !making;
  const next = () => {
    if (!last) {
      setPicked(null);
      setIndex(index + 1);
      return;
    }
    const shown = questions.slice(0, answers.length);
    const score = shown.filter((x, i) => answers[i] === x.correct).length;
    if (user) {
      try {
        savePracticeSession(user.uid, {
          subject: topic.subject,
          grade: topic.grade,
          topic: topic.code,
          score,
          total: shown.length,
        });
      } catch (e) {
        // The results still show; only mastery misses this session.
        console.warn('Could not save practice session', e instanceof Error ? e.message : e);
      }
    }
    usePractice.getState().finish({ questions: shown, picked: answers });
    router.replace('/practice/results');
  };
  // The next question is still being written: Next waits for it instead of ending the session early.
  const waiting = picked != null && index === questions.length - 1 && making;

  return (
    <Screen
      padded={false}
      footer={
        <View className="px-4 pb-8 pt-3">
          <Button
            label={waiting ? 'Making the next question…' : last ? 'See results' : 'Next question'}
            size="lg"
            loading={waiting}
            disabled={picked == null || waiting}
            onPress={next}
          />
        </View>
      }>
      <Header
        back="close"
        title={title}
        subtle
        right={
          <Text variant="small" tone="muted">
            {index + 1}/{total}
          </Text>
        }
      />
      <View className="flex-row gap-1 px-4 py-2" accessibilityLabel={`Question ${index + 1} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < answers.length - (picked != null ? 1 : 0)
                ? answers[i] === questions[i]?.correct
                  ? 'bg-success'
                  : 'bg-danger'
                : i === index
                  ? 'bg-primary'
                  : 'bg-ink/10'
            }`}
          />
        ))}
      </View>
      <Screen scroll edges={[]}>
        <QuizQuestion q={q} index={index} picked={picked} onPick={pick} />
      </Screen>
    </Screen>
  );
}
