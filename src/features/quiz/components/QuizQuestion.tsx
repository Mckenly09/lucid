import { Pressable, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

import type { QuizQuestion as Question } from '../services/parse';

const LETTERS = ['A', 'B', 'C', 'D'];

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

const choiceStyle: Record<ChoiceState, string> = {
  idle: 'border-transparent bg-ink/5 active:bg-ink/10',
  correct: 'border-success/60 bg-success/10',
  wrong: 'border-danger/60 bg-danger/10',
  dim: 'border-transparent bg-ink/5',
};

/** One multiple-choice question (design 07): A–D choices, right/wrong marks once picked, then "Why?". Quiz me and Practice. */
export function QuizQuestion({
  q,
  index,
  picked,
  onPick,
}: {
  q: Question;
  index: number;
  picked: number | null;
  onPick: (choice: number) => void;
}) {
  const stateOf = (i: number): ChoiceState => {
    if (picked == null) return 'idle';
    if (i === q.correct) return 'correct';
    if (i === picked) return 'wrong';
    return 'dim';
  };

  return (
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
              onPress={() => onPick(i)}
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
