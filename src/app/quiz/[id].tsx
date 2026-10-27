import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEMO_QUIZ } from '@/features/demo-data';

const LETTERS = ['A', 'B', 'C', 'D'];

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

const choiceStyle: Record<ChoiceState, string> = {
  idle: 'border-transparent bg-ink/5 active:bg-ink/10',
  correct: 'border-success/60 bg-success/10',
  wrong: 'border-danger/60 bg-danger/10',
  dim: 'border-transparent bg-ink/5',
};

export default function Quiz() {
  const { topic, questions } = DEMO_QUIZ;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;
  const q = questions[index];

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    if (i === q.correct) setScore(score + 1);
  };
  const next = () => {
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
        <View className="flex-row gap-3 px-4 pb-2 pt-3">
          {done ? (
            <Button label="Done" size="lg" className="flex-1" onPress={() => router.back()} />
          ) : (
            <>
              {/* shortcut: save-as-card is a no-op until flashcards are stored */}
              <Button label="Save as card" variant="secondary" size="lg" className="flex-1" disabled={picked == null} onPress={() => {}} />
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
        right={!done && <Text tone="muted">{index + 1}/{questions.length}</Text>}
      />
      <View className="flex-row gap-2 px-4 py-2" accessibilityLabel={`Question ${Math.min(index + 1, questions.length)} of ${questions.length}`}>
        {questions.map((_, i) => (
          <View
            key={i}
            className={`h-2 flex-1 rounded-full ${i < index ? 'bg-success' : i === index ? 'bg-primary' : 'bg-ink/10'}`}
          />
        ))}
      </View>

      {done ? (
        <View className="flex-1 items-center justify-center gap-2 px-4">
          <Text variant="label">Your score</Text>
          <Text variant="display" className="text-center">{score} of {questions.length}</Text>
          <Text tone="muted" className="text-center">
            {score === questions.length ? 'Perfect! You got them all.' : 'Nice work. Review the ones you missed.'}
          </Text>
        </View>
      ) : (
        <Screen scroll edges={[]}>
          <View className="gap-3 pt-4">
            <Text variant="label">Question {index + 1}</Text>
            <Text variant="h1" accessibilityRole="header">{q.question}</Text>
            <View className="mt-3 gap-3">
              {q.choices.map((c, i) => {
                const s = stateOf(i);
                return (
                  <Pressable
                    key={c}
                    onPress={() => pick(i)}
                    disabled={picked != null}
                    accessibilityRole="button"
                    accessibilityLabel={`${LETTERS[i]}: ${c}${s === 'correct' ? ', correct' : s === 'wrong' ? ', your answer, wrong' : ''}`}
                    className={`min-h-14 flex-row items-center gap-4 rounded-lg border px-4 py-3 ${choiceStyle[s]}`}>
                    <Marker letter={LETTERS[i]} state={s} />
                    <Text tone={s === 'dim' ? 'muted' : 'ink'} className="flex-1 text-h3">{c}</Text>
                    {s === 'wrong' && <Text tone="danger" className="font-medium">Your answer</Text>}
                    {s === 'correct' && <Text tone="success" className="font-medium">Correct</Text>}
                  </Pressable>
                );
              })}
            </View>
            {picked != null && (
              <Card className="mt-3 gap-1">
                <Text variant="h3">Why?</Text>
                <Text tone="muted">{q.why}</Text>
              </Card>
            )}
          </View>
        </Screen>
      )}
    </Screen>
  );
}

function Marker({ letter, state }: { letter: string; state: ChoiceState }) {
  if (state === 'correct' || state === 'wrong') {
    return (
      <View className={`h-8 w-8 items-center justify-center rounded-full ${state === 'correct' ? 'bg-success' : 'bg-danger'}`}>
        <Icon
          ios={state === 'correct' ? 'checkmark' : 'xmark'}
          android={state === 'correct' ? 'check' : 'close'}
          size={16}
          className="text-paper"
        />
      </View>
    );
  }
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full border border-ink/20">
      <Text variant="caption" tone="muted">{letter}</Text>
    </View>
  );
}
