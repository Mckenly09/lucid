import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { saveCard } from '@/db/cards';
import { topicStats } from '@/db/practice';
import { useAuth } from '@/features/auth/useAuth';
import { type CardDraft, SaveCardSheet } from '@/features/flashcards/components/SaveCardSheet';
import { ScoreDots } from '@/features/practice/components/ScoreDots';
import { usePractice } from '@/features/practice/store';

/** "Up from 6 last time. Nice!" (v2-06); `previous` is the session before this one. */
function change(score: number, previous: number | undefined) {
  if (previous === undefined) return 'Your first try at this topic.';
  if (score > previous) return `Up from ${previous} last time. Nice!`;
  if (score < previous) return `Down from ${previous} last time. Keep practicing.`;
  return 'Same as last time.';
}

/** Practice results (design v2-06): score, change, a dot per question, the missed ones to save as cards. */
export default function PracticeResults() {
  const { user } = useAuth();
  const [{ topic, result }] = useState(() => usePractice.getState());
  const [previous] = useState(() => {
    if (!user || !topic) return undefined;
    try {
      return topicStats(user.uid, topic.subject, topic.grade)[topic.code]?.previous;
    } catch {
      return undefined;
    }
  });
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState<{ card: CardDraft; at: number } | null>(null);

  if (!topic || !result) {
    return (
      <Screen>
        <Header back="close" title="Practice" subtle />
        <EmptyState title="No results yet" message="Finish a practice session to see your score here." />
      </Screen>
    );
  }

  const { questions, picked } = result;
  const right = questions.map((q, i) => picked[i] === q.correct);
  const score = right.filter(Boolean).length;
  const missed = questions.flatMap((q, i) => (right[i] ? [] : [{ q, at: i }]));
  const unsaved = missed.filter((m) => !saved.has(m.at));
  const card = (at: number): CardDraft => {
    const q = questions[at];
    return { subject: topic.subject, front: q.question, back: `${q.choices[q.correct]}. ${q.why}`.trim() };
  };

  // Straight into the subject's deck (the bookmark opens the full Save card sheet for one).
  const saveAll = () => {
    if (!user) return;
    const done = new Set(saved);
    for (const m of unsaved) {
      try {
        saveCard(user.uid, card(m.at));
        done.add(m.at);
      } catch (e) {
        console.warn('Could not save card', e instanceof Error ? e.message : e);
      }
    }
    setSaved(done);
  };

  return (
    <Screen
      scroll
      footer={
        <View className="gap-3 px-4 pb-8 pt-3">
          {missed.length > 0 && (
            <Button
              label={unsaved.length ? `Save all ${unsaved.length} as cards` : 'Saved as cards'}
              size="lg"
              disabled={!unsaved.length}
              onPress={saveAll}
            />
          )}
          <View className="flex-row gap-3">
            <Button
              label="Practice again"
              variant="secondary"
              size="lg"
              className="flex-1"
              onPress={() => router.replace('/practice/session')}
            />
            <Button
              label="Other topics"
              variant="secondary"
              size="lg"
              className="flex-1"
              onPress={() => router.back()}
            />
          </View>
        </View>
      }>
      <Header back="close" title={`Practice · ${topic.name}`} subtle />
      <View
        accessible
        accessibilityLabel={`${score} out of ${questions.length}`}
        className="mt-6 flex-row items-end justify-center">
        <Text variant="display">{score}</Text>
        <Text variant="h2" tone="muted" className="pb-1">
          /{questions.length}
        </Text>
      </View>
      <Text tone="muted" className="mt-2 text-center">
        {change(score, previous)}
      </Text>
      <View className="mt-6">
        <ScoreDots results={right} />
      </View>

      {missed.length > 0 ? (
        <>
          <Text variant="label" className="mb-2 mt-8">
            To review ({missed.length})
          </Text>
          <View className="gap-3">
            {missed.map(({ q, at }) => (
              <Card key={at} className="flex-row gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-danger/10">
                  <Icon name="X" size={14} tone="danger" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold">{q.question}</Text>
                  <Text variant="small" tone="muted">
                    Answer: {q.choices[q.correct]}
                  </Text>
                </View>
                <IconButton
                  icon={<Icon name={saved.has(at) ? 'BookmarkCheck' : 'Bookmark'} size={20} />}
                  onPress={() => setDraft({ card: card(at), at })}
                  disabled={saved.has(at)}
                  accessibilityLabel={saved.has(at) ? 'Saved as card' : 'Save as card'}
                  className="-mr-2 -mt-2"
                />
              </Card>
            ))}
          </View>
        </>
      ) : (
        <Text className="mt-8 text-center font-medium">All right. Nothing to review.</Text>
      )}

      <Text variant="caption" tone="muted" className="mt-6 font-sans">
        Questions made from: {[...new Set(topic.packs.map((p) => p.attribution))].join(' · ')}
      </Text>

      <SaveCardSheet
        draft={draft?.card ?? null}
        onClose={() => setDraft(null)}
        onSaved={() => {
          if (draft) setSaved(new Set(saved).add(draft.at));
          setDraft(null);
        }}
      />
    </Screen>
  );
}
