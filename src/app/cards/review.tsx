import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { countDueBetween, type FlashCard, listDueCards, saveReview } from '@/db/cards';
import { useAuth } from '@/features/auth/useAuth';
import { endOfDay, intervalLabel, type Rating, schedule } from '@/features/flashcards/services/schedule';
import { subject } from '@/llm/subjects/config';

const RATINGS: { rating: Rating; label: string; className: string; tone: 'danger' | 'warning' | 'primary' | 'success' }[] = [
  { rating: 'again', label: 'Again', className: 'bg-danger/10 active:bg-danger/20', tone: 'danger' },
  { rating: 'hard', label: 'Hard', className: 'bg-warning/10 active:bg-warning/20', tone: 'warning' },
  { rating: 'good', label: 'Good', className: 'bg-primary/10 active:bg-primary/20', tone: 'primary' },
  { rating: 'easy', label: 'Easy', className: 'bg-success/10 active:bg-success/20', tone: 'success' },
];

// Outside the component: the React Compiler lint can't tell this handler-only read from a render-time one.
const clock = () => Date.now();

export default function Review() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  // Today's due cards, read once so ratings don't reshuffle the session.
  const [queue, setQueue] = useState<FlashCard[]>(() => (uid ? listDueCards(uid, endOfDay(Date.now())) : []));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<{ card: FlashCard; rating: Rating }[]>([]);
  const [failed, setFailed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  // Set when the last card is rated, so the done screen reads the clock once.
  const [summary, setSummary] = useState<{ minutes: number; tomorrow: number } | null>(null);

  const card = queue[index];
  const done = queue.length > 0 && !card;


  const rate = (rating: Rating) => {
    const now = clock();
    try {
      saveReview(uid, card.id, schedule(card, rating, now));
    } catch (e) {
      // Keep going; the card just stays due and comes back next time.
      console.warn('Could not save review', e instanceof Error ? e.message : e);
      setFailed(true);
    }
    setRatings([...ratings, { card, rating }]);
    setIndex(index + 1);
    setFlipped(false);
    if (index + 1 === queue.length) {
      setSummary({
        minutes: Math.max(1, Math.round((now - startedAt) / 60_000)),
        tomorrow: countDueBetween(uid, endOfDay(now), endOfDay(now, 1)),
      });
    }
  };

  // "Review the N hard ones again": a second pass over this session's Again and Hard cards, with their new state.
  const hard = ratings.filter((r) => r.rating === 'again' || r.rating === 'hard');
  const reviewHardAgain = () => {
    const ids = new Set(hard.map((r) => r.card.id));
    const fresh = uid ? listDueCards(uid, Number.MAX_SAFE_INTEGER).filter((c) => ids.has(c.id)) : [];
    setQueue(fresh);
    setIndex(0);
    setRatings([]);
    setSummary(null);
    setStartedAt(Date.now());
  };

  if (queue.length === 0) {
    return (
      <Screen>
        <Header back="close" />
        <EmptyState
          icon={<Icon name="CircleCheck" size={40} tone="success" />}
          title="Nothing to review"
          message="No cards are due today. Come back tomorrow."
          action={<Button label="Done" onPress={() => router.back()} className="mt-4" />}
        />
      </Screen>
    );
  }

  if (done) {
    const count = (...rs: Rating[]) => ratings.filter((r) => rs.includes(r.rating)).length;
    const { minutes, tomorrow } = summary ?? { minutes: 1, tomorrow: 0 };
    return (
      <Screen
        footer={
          <View className="gap-3 px-4 pb-8 pt-3">
            {hard.length > 0 && (
              <Button
                label={hard.length === 1 ? 'Review the hard one again' : `Review the ${hard.length} hard ones again`}
                variant="secondary"
                size="lg"
                onPress={reviewHardAgain}
              />
            )}
            <Button label="Done" size="lg" onPress={() => router.back()} />
          </View>
        }>
        <Header back="close" />
        <View className="flex-1 items-center justify-center gap-2" accessibilityLiveRegion="polite">
          <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <Icon name="Check" size={32} tone="success" />
          </View>
          <Text variant="h1" accessibilityRole="header" className="text-center">
            {/* Again/Hard cards come back within minutes, so they're still due today. */}
            {hard.length > 0 ? 'Session done' : 'All done for today'}
          </Text>
          <Text tone="muted" className="text-center">
            You reviewed {ratings.length === 1 ? '1 card' : `${ratings.length} cards`} in {minutes}{' '}
            {minutes === 1 ? 'minute' : 'minutes'}.
          </Text>
          <View className="mt-6 flex-row gap-2 self-stretch">
            <Stat value={count('good', 'easy')} label="Good or Easy" tone="success" />
            <Stat value={count('hard')} label="Hard" tone="warning" />
            <Stat value={count('again')} label="Again" tone="danger" />
          </View>
          {tomorrow > 0 && (
            <View className="mt-4 flex-row items-center gap-2">
              <Icon name="Clock" size={16} tone="muted" />
              <Text variant="small" tone="muted">
                Next review: tomorrow · {tomorrow === 1 ? '1 card' : `${tomorrow} cards`}
              </Text>
            </View>
          )}
          {failed && (
            <Text variant="small" tone="danger" className="mt-2 text-center">
              Some reviews couldn&apos;t be saved. Those cards will come back next time.
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  const s = subject(card.subject);
  const chatId = card.chatId;
  return (
    <Screen
      footer={
        <View className="px-4 pb-8 pt-3">
          {flipped ? (
            <>
              <Text variant="caption" tone="muted" className="mb-2 text-center">
                How well did you know it?
              </Text>
              <View className="flex-row gap-2">
                {RATINGS.map((r) => {
                  const next = intervalLabel(schedule(card, r.rating, 0).dueAt);
                  return (
                    <Pressable
                      key={r.rating}
                      onPress={() => rate(r.rating)}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.label}, next review in ${next}`}
                      className={`min-h-14 flex-1 items-center justify-center rounded-md py-2 ${r.className}`}>
                      <Text variant="small" tone={r.tone} className="font-semibold">
                        {r.label}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {next}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Button label="Show answer" size="lg" onPress={() => setFlipped(true)} />
          )}
        </View>
      }>
      <Header
        back="close"
        right={
          <Text variant="small" tone="muted">
            {index + 1} of {queue.length}
          </Text>
        }
      />
      <ProgressBar value={index / queue.length} label={`Card ${index + 1} of ${queue.length}`} className="h-1" />

      <Card variant="outlined" className="my-4 flex-1 gap-4 p-6">
        <View className="flex-row">
          <Badge label={s.short} />
        </View>
        {flipped ? (
          <View className="flex-1 gap-4" accessibilityLiveRegion="polite">
            <Text tone="muted">{card.front}</Text>
            <Text variant="label">Answer</Text>
            <Text variant="h3">{card.back}</Text>
          </View>
        ) : (
          <View className="flex-1 justify-center gap-2">
            <Text variant="label">Question</Text>
            <Text variant="h1">{card.front}</Text>
          </View>
        )}
        {flipped
          ? chatId && (
              <Button
                label="Open the original chat"
                variant="ghost"
                size="sm"
                icon={<Icon name="MessageCircle" size={16} tone="primary" />}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chatId } })}
                className="self-start"
              />
            )
          : (
              <Text variant="small" tone="muted">
                Think of your answer first.
              </Text>
            )}
      </Card>
    </Screen>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'success' | 'warning' | 'danger' }) {
  return (
    <Card className="flex-1 items-center gap-1">
      <Text variant="h1" tone={tone}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" className="text-center">
        {label}
      </Text>
    </Card>
  );
}
