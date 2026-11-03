import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { SubjectCode } from '@/components/list-item';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { type Deck, deleteDeck } from '@/db/cards';
import { useAuth } from '@/features/auth/useAuth';
import { reviewMinutes, useDecks } from '@/features/flashcards/useCards';
import { PracticePanel } from '@/features/practice/components/PracticePanel';
import { subject } from '@/llm/subjects/config';

type CardsView = 'cards' | 'practice';
const VIEWS: { id: CardsView; label: string }[] = [
  { id: 'cards', label: 'My cards' },
  { id: 'practice', label: 'Practice' },
];

/** "Cards" with the My cards | Practice switch (design v2-05); Practice lives here, not in a new tab (v2.md §3). */
function TitleRow({ view, onChange }: { view: CardsView; onChange: (v: CardsView) => void }) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-3 pt-6">
      <Text variant="h1" accessibilityRole="header">
        Cards
      </Text>
      <Segmented value={view} onChange={onChange} options={VIEWS} label="Cards view" />
    </View>
  );
}

export default function Cards() {
  const [view, setView] = useState<CardsView>('cards');
  // One Screen and a fixed title, so switching only fades in the content below instead of rebuilding the page.
  // Short fade: a long one leaves the page blank for a moment and reads as a flicker.
  return (
    <Screen edges={['top']} padded={false}>
      <View className="px-4">
        <TitleRow view={view} onChange={setView} />
      </View>
      <Animated.View key={view} entering={FadeIn.duration(150)} className="flex-1">
        {view === 'practice' ? <PracticePanel /> : <MyCards />}
      </Animated.View>
    </Screen>
  );
}

function MyCards() {
  const { user } = useAuth();
  const { decks, due, total, refresh } = useDecks();
  const [shuffled, setShuffled] = useState(false);
  const [removing, setRemoving] = useState<Deck | null>(null);

  const remove = () => {
    if (!user || !removing) return;
    try {
      deleteDeck(user.uid, removing.subject);
    } catch (e) {
      console.warn('Could not delete deck', e instanceof Error ? e.message : e);
    }
    setRemoving(null);
    refresh();
  };

  if (total === 0) {
    return (
      <View className="flex-1 px-4">
        <EmptyState
          icon={
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-lg border border-ink/10 bg-ink/5">
              <Icon name="Bookmark" size={28} />
            </View>
          }
          title="No cards yet"
          message="When an answer helps you, tap the bookmark to save it as a card. Lucid will remind you to review it."
          action={
            <Button
              label="Ask a question"
              variant="secondary"
              onPress={() => router.navigate('/ask')}
              className="mt-4"
            />
          }
        />
      </View>
    );
  }

  const dueDecks = decks.filter((d) => d.due > 0);
  return (
    <View className="flex-1">
      <FlatList
        data={decks}
        keyExtractor={(d) => d.subject}
        renderItem={({ item }) => <DeckRow deck={item} onMenu={() => setRemoving(item)} />}
        contentContainerClassName="px-4 pb-6"
        ListHeaderComponent={
          <View>
            <Text variant="small" tone="muted" className="pt-1">
              {total === 1 ? '1 card' : `${total} cards`} in {decks.length === 1 ? '1 deck' : `${decks.length} decks`}
            </Text>

            <Card variant="outlined" className="mt-6 gap-4">
              <View className="min-h-11 flex-row items-center justify-between">
                <Text variant="label">Today&apos;s review</Text>
                {due > 0 && (
                  <IconButton
                    icon={<Icon name="Shuffle" size={20} tone={shuffled ? 'paper' : 'muted'} />}
                    variant={shuffled ? 'filled' : 'plain'}
                    onPress={() => setShuffled(!shuffled)}
                    disabled={due < 2}
                    accessibilityLabel={shuffled ? 'Shuffle on' : 'Shuffle off'}
                    className="-my-2"
                  />
                )}
              </View>
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
                      value={dueDecks.map((d) => ({
                        value: d.due / due,
                        status: 'primary' as const,
                      }))}
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
                    onPress={() =>
                      router.push({
                        pathname: '/cards/review',
                        params: shuffled ? { shuffle: '1' } : {},
                      })
                    }
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

      <Sheet visible={!!removing} onClose={() => setRemoving(null)} title="Delete this deck?">
        <Text tone="muted">
          {removing &&
            `All ${removing.total === 1 ? '1 card' : `${removing.total} cards`} in ${subject(removing.subject).short} will be removed from this phone.`}
        </Text>
        <View className="mt-6 flex-row gap-3">
          <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={() => setRemoving(null)} />
          <Button label="Delete" variant="danger" size="lg" className="flex-1" onPress={remove} />
        </View>
      </Sheet>
    </View>
  );
}

function DeckRow({ deck, onMenu }: { deck: Deck; onMenu: () => void }) {
  const s = subject(deck.subject);
  const allLearned = deck.learned === deck.total;
  return (
    <View className="min-h-11 flex-row items-center gap-1 border-b border-ink/10 py-3">
      <View
        accessible
        accessibilityLabel={`${s.short}: ${deck.learned} of ${deck.total} learned, ${deck.due} due`}
        className="flex-1 flex-row items-center gap-3">
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
      <IconButton
        icon={<Icon name="EllipsisVertical" size={20} tone="muted" />}
        onPress={onMenu}
        accessibilityLabel={`${s.short} deck options`}
        className="-mr-3"
      />
    </View>
  );
}
