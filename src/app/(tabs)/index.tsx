import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DueCardsCard } from '@/components/due-cards-card';
import { Icon, type IconName } from '@/components/icon';
import { SubjectCode } from '@/components/list-item';
import { Logo } from '@/components/logo';
import { OfflineBadge } from '@/components/offline-badge';
import { Screen } from '@/components/screen';
import { SubjectTile } from '@/components/subject-tile';
import { Text } from '@/components/text';
import { AccountButton } from '@/features/auth/components/AccountButton';
import { useAuth } from '@/features/auth/useAuth';
import { askNow } from '@/features/chat/ask-now';
import { SUGGESTIONS } from '@/features/demo-data';
import { reviewMinutes, useDecks } from '@/features/flashcards/useCards';
import { groupOf, timeLabel } from '@/features/history/services/when';
import { usePacks } from '@/features/knowledge/store';
import { useChats } from '@/features/history/useChats';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';

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
  const installed = usePacks((s) => s.installed);
  // One tile per subject that has a downloaded pack, in the app's subject order.
  const packSubjects = SUBJECTS.filter((s) => Object.values(installed).some((p) => p.subject === s.id));
  const subjectRows = Array.from({ length: Math.ceil(packSubjects.length / 3) }, (_, i) => packSubjects.slice(i * 3, i * 3 + 3));

  // Nothing asked or saved yet: the first-time Home (welcome, suggestions, how to study).
  const firstTime = recent.length === 0 && due === 0;

  const openAsk = (params: { subject?: SubjectId; at?: string; focus?: string }) =>
    router.navigate({ pathname: '/ask', params });

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

      {/* Tools sit under the Ask box on the everyday Home; the first-time Home keeps to getting started (design T1/T2). */}
      {!firstTime && (
        <View className="mt-4 flex-row gap-2">
          <ToolTile icon="Calculator" title="Calculator" caption="Scientific" onPress={() => router.push('/tools/calculator')} />
          <ToolTile icon="Atom" title="Periodic table" caption="118 elements" onPress={() => router.push('/tools/periodic-table')} />
        </View>
      )}

      {due > 0 && (
        <View className="mt-6">
          <DueCardsCard count={due} minutes={reviewMinutes(due)} onReview={() => router.push('/cards/review')} />
        </View>
      )}

      {recent.length > 0 && (
        <>
          <View className="mt-8 flex-row items-center justify-between">
            <Text variant="label">Continue</Text>
            <Button label="See all" variant="secondary" size="sm" onPress={() => router.navigate('/history')} />
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
                onPress={() => user && askNow(user.uid, x.subject, x.q)}
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
          <View className="mb-2 mt-8 flex-row items-center justify-between">
            <Text variant="label">Subjects</Text>
            {packSubjects.length > 0 && (
              <Button label="Get more" variant="secondary" size="sm" onPress={() => router.navigate('/library')} />
            )}
          </View>
          {packSubjects.length === 0 ? (
            <Card
              onPress={() => router.navigate('/library')}
              accessibilityLabel="Download subject packs"
              className="mb-6 flex-row items-center gap-3">
              <Icon name="Download" size={22} tone="muted" />
              <Text variant="small" tone="muted" className="flex-1">
                Download a subject pack in Library to see your subjects here.
              </Text>
              <Icon name="ChevronRight" size={18} tone="muted" />
            </Card>
          ) : (
            <View className="gap-2 pb-6">
              {subjectRows.map((row) => (
                <View key={row[0].id} className="flex-row gap-2">
                  {row.map((s) => (
                    <SubjectTile key={s.id} code={s.code} name={s.short} onPress={() => openAsk({ subject: s.id, at: String(Date.now()) })} />
                  ))}
                  {/* Keep tiles in a short last row the same width as full rows. */}
                  {Array.from({ length: 3 - row.length }, (_, i) => (
                    <View key={i} className="flex-1" />
                  ))}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function ToolTile({ icon, title, caption, onPress }: { icon: IconName; title: string; caption: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${caption}`}
      className="min-h-11 flex-1 flex-row items-center gap-3 rounded-md bg-ink/5 px-3 py-2 active:bg-ink/10">
      <View className="h-9 w-9 items-center justify-center rounded-md bg-primary/10">
        <Icon name={icon} size={20} tone="primary" />
      </View>
      <View className="flex-1">
        <Text variant="small" className="font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" className="font-sans" numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </Pressable>
  );
}
