import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DueCardsCard } from '@/components/due-cards-card';
import { Icon } from '@/components/icon';
import { SubjectCode } from '@/components/list-item';
import { Logo } from '@/components/logo';
import { OfflineBadge } from '@/components/offline-badge';
import { Screen } from '@/components/screen';
import { SubjectTile } from '@/components/subject-tile';
import { Text } from '@/components/text';
import { AccountButton } from '@/features/auth/components/AccountButton';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { SUGGESTIONS } from '@/features/demo-data';
import { reviewMinutes, useDecks } from '@/features/flashcards/useCards';
import { groupOf, timeLabel } from '@/features/history/services/when';
import { useChats } from '@/features/history/useChats';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';

// Two rows of three for the subject grid.
const SUBJECT_ROWS = [SUBJECTS.slice(0, 3), SUBJECTS.slice(3, 6)];

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  const { due } = useDecks();
  const recent = useChats('', 2);

  // Nothing asked or saved yet: the first-time Home (welcome, suggestions, how to study).
  const firstTime = recent.length === 0 && due === 0;

  const openAsk = (params: { subject?: SubjectId; at?: string; focus?: string }) =>
    router.navigate({ pathname: '/ask', params });
  const askNow = (subjectId: SubjectId, q: string) => {
    if (!user) return;
    const { newChat, ask } = useChat.getState();
    const id = newChat(user.uid, subjectId);
    void ask(id, q);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <Screen scroll edges={['top']}>
      <View className="h-11 flex-row items-center gap-2">
        <Logo size="sm" />
        <Text variant="h3">Lucid</Text>
        <View className="-mr-2 ml-auto flex-row items-center gap-1">
          <OfflineBadge />
          <AccountButton />
        </View>
      </View>

      <View className="mt-6 gap-1">
        <Text variant="h1" accessibilityRole="header">
          {firstTime
            ? firstName
              ? `Welcome, ${firstName}`
              : 'Welcome'
            : firstName
              ? `${greeting(new Date().getHours())}, ${firstName}`
              : greeting(new Date().getHours())}
        </Text>
        <Text tone="muted">{firstTime ? 'Lucid is ready. Ask your first question.' : 'What are we studying today?'}</Text>
      </View>

      <Pressable
        // A fresh value each tap so Ask focuses its input again even if it's already mounted.
        onPress={() => openAsk({ focus: String(Date.now()) })}
        accessibilityRole="button"
        accessibilityLabel="Ask anything"
        className="mt-6 min-h-14 flex-row items-center gap-3 rounded-full border border-ink/10 bg-ink/5 pl-4 pr-1 active:bg-ink/10">
        <Icon name="MessageCircle" size={20} tone="muted" />
        <Text tone="muted" className="flex-1">
          Ask anything…
        </Text>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Icon name="ArrowUp" size={20} tone="paper" />
        </View>
      </Pressable>

      {due > 0 && (
        <View className="mt-6">
          <DueCardsCard count={due} minutes={reviewMinutes(due)} onReview={() => router.push('/cards/review')} />
        </View>
      )}

      {recent.length > 0 && (
        <>
          <View className="mt-8 flex-row items-center justify-between">
            <Text variant="label">Continue</Text>
            <Button label="See all" variant="ghost" size="sm" onPress={() => router.navigate('/history')} className="-mr-3" />
          </View>
          <View className="mt-2 gap-2">
            {recent.map((c) => (
              <Card
                key={c.id}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
                accessibilityLabel={`Continue: ${c.title}`}
                className="flex-row items-center gap-3">
                <SubjectCode code={subject(c.subject).code} />
                <View className="flex-1">
                  <Text className="font-medium" numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {subject(c.subject).short} · {groupOf(c.updatedAt)}, {timeLabel(c.updatedAt)}
                  </Text>
                </View>
                <Icon name="ChevronRight" size={18} tone="muted" />
              </Card>
            ))}
          </View>
        </>
      )}

      {firstTime && (
        <>
          <Text variant="label" className="mb-2 mt-8">
            Try one of these
          </Text>
          <View className="gap-2">
            {SUGGESTIONS.map((x) => (
              <Card
                key={x.q}
                onPress={() => askNow(x.subject, x.q)}
                accessibilityLabel={`Ask: ${x.q}`}
                className="flex-row items-center gap-3">
                <SubjectCode code={subject(x.subject).code} />
                <Text className="flex-1">{x.q}</Text>
                <Icon name="ChevronRight" size={18} tone="muted" />
              </Card>
            ))}
          </View>
          <Card variant="outlined" className="mt-6 gap-3">
            <Text variant="h3">How to study with Lucid</Text>
            {['Ask a question from any subject.', 'Tap Quiz me to test yourself.', 'Save answers as cards and review them daily.'].map(
              (step, i) => (
                <View key={step} className="flex-row items-center gap-3">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-ink/10">
                    <Text variant="caption">{i + 1}</Text>
                  </View>
                  <Text variant="small" tone="muted" className="flex-1">
                    {step}
                  </Text>
                </View>
              ),
            )}
          </Card>
        </>
      )}

      {firstTime ? (
        <View className="pb-6" />
      ) : (
        <>
          <Text variant="label" className="mb-2 mt-8">
            Subjects
          </Text>
          <View className="gap-2 pb-6">
            {SUBJECT_ROWS.map((row) => (
              <View key={row[0].id} className="flex-row gap-2">
                {row.map((s) => (
                  <SubjectTile key={s.id} code={s.code} name={s.short} onPress={() => openAsk({ subject: s.id, at: String(Date.now()) })} />
                ))}
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
