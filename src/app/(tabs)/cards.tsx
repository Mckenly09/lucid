import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { DEMO_CARDS } from '@/features/demo-data';
import { subject, type SubjectId } from '@/llm/subjects/config';

// Intervals shown under each rating; the real ones come from the SM-2 schedule (roadmap v1).
const RATINGS = [
  { label: 'Again', next: '<1 min' },
  { label: 'Hard', next: '10 min' },
  { label: 'Good', next: '1 day' },
  { label: 'Easy', next: '4 days' },
] as const;

export default function Cards() {
  const [filter, setFilter] = useState<SubjectId | 'all'>('all');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const due = DEMO_CARDS.filter((c) => filter === 'all' || c.subject === filter);
  const counts = new Map<SubjectId, number>();
  DEMO_CARDS.forEach((c) => counts.set(c.subject, (counts.get(c.subject) ?? 0) + 1));
  const options = [
    { id: 'all' as const, label: 'All' },
    ...[...counts].map(([id, n]) => ({ id, label: `${subject(id).short} · ${n}` })),
  ];
  const card = due[index];

  const pickFilter = (id: SubjectId | 'all') => {
    setFilter(id);
    setIndex(0);
    setFlipped(false);
  };
  // shortcut: rating just advances; save the review with the SM-2 schedule once flashcards are in SQLite.
  const rate = () => {
    setIndex(index + 1);
    setFlipped(false);
  };

  return (
    <Screen scroll edges={['top']}>
      <View className="gap-1 pt-4">
        <Text variant="display" accessibilityRole="header">Cards</Text>
        <Text variant="h3" tone="muted" className="font-sans">
          {due.length} due today · {Math.min(index, due.length)} done
        </Text>
      </View>

      <View className="mt-4 gap-4">
        <SubjectPicker value={filter} onChange={pickFilter} options={options} />
        <ProgressBar value={due.length ? index / due.length : 0} label="Cards reviewed today" />
      </View>

      {card ? (
        <>
          <Pressable
            onPress={() => setFlipped(!flipped)}
            accessibilityRole="button"
            accessibilityLabel={flipped ? `Answer: ${card.back}` : `${card.front}. Tap to see the answer`}
            className="my-4 flex-1 rounded-lg border border-ink/10 bg-ink/5 p-6 active:bg-ink/10">
            <View className="flex-row justify-between">
              <Text variant="small" tone="muted">
                {subject(card.subject).short} · {card.topic}
              </Text>
              <Text variant="small" tone="muted">
                Card {index + 1} of {due.length}
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text variant="display">{flipped ? card.back : card.front}</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Icon ios="arrow.triangle.2.circlepath" android="sync" className="text-ink/80" />
              <Text tone="muted" className="font-semibold text-h3">
                {flipped ? 'Tap to see the question' : 'Tap to see the answer'}
              </Text>
            </View>
          </Pressable>

          <View className="mb-3 flex-row gap-2">
            {RATINGS.map((r) => (
              <Pressable
                key={r.label}
                onPress={rate}
                disabled={!flipped}
                accessibilityRole="button"
                accessibilityLabel={`${r.label}, next review in ${r.next}`}
                accessibilityState={{ disabled: !flipped }}
                className={`min-h-11 flex-1 items-center rounded-md bg-ink/5 py-3 active:bg-ink/10 ${flipped ? '' : 'opacity-40'}`}>
                <Text variant="h3">{r.label}</Text>
                <Text variant="small" tone="muted">{r.next}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          icon={<Icon ios="checkmark.circle" android="check_circle" size={40} className="text-success" />}
          title="All done for today"
          message="Save answers or quiz questions as cards to review them here."
        />
      )}
    </Screen>
  );
}
