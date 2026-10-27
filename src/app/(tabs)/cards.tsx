import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { SubjectCode } from '@/components/list-item';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import type { Deck } from '@/db/cards';
import { reviewMinutes, useDecks } from '@/features/flashcards/useCards';
import { subject } from '@/llm/subjects/config';

export default function Cards() {
  const { decks, due, total } = useDecks();

  if (total === 0) {
    return (
      <Screen edges={['top']}>
        <Text variant="h1" accessibilityRole="header" className="pt-6">
          Cards
        </Text>
        <EmptyState
          icon={
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-lg border border-ink/10 bg-ink/5">
              <Icon name="Bookmark" size={28} />
            </View>
          }
          title="No cards yet"
          message="When an answer helps you, tap the bookmark to save it as a card. Lucid will remind you to review it."
          action={<Button label="Ask a question" variant="secondary" onPress={() => router.navigate('/ask')} className="mt-4" />}
        />
      </Screen>
    );
  }

  const dueDecks = decks.filter((d) => d.due > 0);
  return (
    <Screen edges={['top']} padded={false}>
      <FlatList
        data={decks}
        keyExtractor={(d) => d.subject}
        renderItem={({ item }) => <DeckRow deck={item} />}
        contentContainerClassName="px-4 pb-6"
        ListHeaderComponent={
          <View>
            <View className="gap-1 pt-6">
              <Text variant="h1" accessibilityRole="header">
                Cards
              </Text>
              <Text variant="small" tone="muted">
                {total === 1 ? '1 card' : `${total} cards`} in {decks.length === 1 ? '1 deck' : `${decks.length} decks`}
              </Text>
            </View>

            <Card variant="outlined" className="mt-6 gap-4">
              <Text variant="label">Today&apos;s review</Text>
              {due > 0 ? (
                <>
                  <View className="flex-row items-end gap-3">
                    <Text variant="display">{due}</Text>
                    <View className="pb-1">
                      <Text className="font-medium">{due === 1 ? 'card due' : 'cards due'}</Text>
                      <Text variant="small" tone="muted">
                        About {reviewMinutes(due)} {reviewMinutes(due) === 1 ? 'minute' : 'minutes'}
                      </Text>
                    </View>
                  </View>
                  <View className="gap-2">
                    <ProgressBar
                      value={dueDecks.map((d) => ({ value: d.due / due, status: 'primary' as const }))}
                      label={`${due} cards due`}
                    />
                    <Text variant="caption" tone="muted">
                      {dueDecks.map((d) => `${subject(d.subject).short} ${d.due}`).join(' · ')}
                    </Text>
                  </View>
                  <Button
                    label="Start review"
                    size="lg"
                    icon={<Icon name="Play" size={18} tone="paper" />}
                    onPress={() => router.push('/cards/review')}
                  />
                </>
              ) : (
                <View className="flex-row items-center gap-3">
                  <Icon name="CircleCheck" size={24} tone="success" />
                  <Text tone="muted" className="flex-1">
                    All caught up. Come back tomorrow for your next review.
                  </Text>
                </View>
              )}
            </Card>

            <Text variant="label" className="mb-2 mt-8">
              Decks
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

function DeckRow({ deck }: { deck: Deck }) {
  const s = subject(deck.subject);
  const allLearned = deck.learned === deck.total;
  return (
    <View
      accessible
      accessibilityLabel={`${s.short}: ${deck.learned} of ${deck.total} learned, ${deck.due} due`}
      className="min-h-11 flex-row items-center gap-3 border-b border-ink/10 py-3">
      <SubjectCode code={s.code} />
      <View className="flex-1 gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-medium" numberOfLines={1}>
            {s.short}
          </Text>
          <Text variant="caption" tone="muted">
            {deck.learned} of {deck.total} learned
          </Text>
        </View>
        <ProgressBar value={deck.learned / deck.total} label={`${s.short} learned`} className="h-1" />
      </View>
      {deck.due > 0 ? (
        <View className="h-6 min-w-6 items-center justify-center rounded-full bg-ink/10 px-2">
          <Text variant="caption">{deck.due}</Text>
        </View>
      ) : (
        allLearned && <Icon name="Check" size={18} tone="success" />
      )}
    </View>
  );
}
