import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ListItem, SubjectCode } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { type ChatSummary, deleteChat } from '@/db/chats';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { groupOf, timeLabel } from '@/features/history/services/when';
import { useChats } from '@/features/history/useChats';
import { useColor } from '@/hooks/use-color';
import { subject } from '@/llm/subjects/config';

type Row = { kind: 'group'; title: string } | { kind: 'item'; item: ChatSummary };

export default function History() {
  const [query, setQuery] = useState('');
  const placeholderColor = useColor('default');

  const { user } = useAuth();
  const [removing, setRemoving] = useState<ChatSummary | null>(null);
  // Hidden right away; useChats re-reads SQLite on the next focus.
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const q = query.trim();
  const items = useChats(q).filter((c) => !removed.has(c.id));

  const remove = () => {
    if (!user || !removing) return;
    try {
      deleteChat(user.uid, removing.id);
      useChat.setState((s) => {
        const { [removing.id]: _gone, ...chats } = s.chats;
        return { chats };
      });
      setRemoved(new Set(removed).add(removing.id));
    } catch (e) {
      console.warn('Could not delete chat', e instanceof Error ? e.message : e);
    }
    setRemoving(null);
  };

  if (!q && items.length === 0) {
    return (
      <Screen edges={['top']}>
        <Text variant="h1" accessibilityRole="header" className="pt-6">
          History
        </Text>
        <EmptyState
          icon={
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full border border-ink/10 bg-ink/5">
              <Icon name="Clock" size={28} />
            </View>
          }
          title="No chats yet"
          message="Your questions and answers will be saved here — only on your phone."
          action={<Button label="Ask your first question" variant="secondary" onPress={() => router.navigate('/ask')} className="mt-4" />}
        />
      </Screen>
    );
  }
  const rows: Row[] = [];
  items.forEach((item, i) => {
    const group = groupOf(item.updatedAt);
    if (group !== (i > 0 ? groupOf(items[i - 1].updatedAt) : undefined)) rows.push({ kind: 'group', title: group });
    rows.push({ kind: 'item', item });
  });

  return (
    <Screen edges={['top']}>
      <Text variant="h1" accessibilityRole="header" className="pt-6">
        History
      </Text>
      <View className="mt-4 min-h-12 flex-row items-center gap-2 rounded-sm bg-ink/5 px-4">
        <Icon name="Search" size={18} tone="muted" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your questions"
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Search your questions"
          returnKeyType="search"
          className="flex-1 py-3 font-sans text-body text-ink"
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'group' ? `g-${r.title}` : r.item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-6"
        ListEmptyComponent={
          <EmptyState
            title="No matches"
            message="Try a different word."
          />
        }
        renderItem={({ item: r }) =>
          r.kind === 'group' ? (
            <Text variant="label" className="mb-1 mt-4">
              {r.title}
            </Text>
          ) : (
            <ListItem
              title={r.item.title}
              subtitle={r.item.preview}
              left={<SubjectCode code={subject(r.item.subject).code} />}
              right={
                <Text variant="caption" tone="muted" className="font-sans">
                  {timeLabel(r.item.updatedAt)}
                </Text>
              }
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: r.item.id },
                })
              }
              onLongPress={() => setRemoving(r.item)}
              longPressLabel="Delete chat"
            />
          )
        }
      />

      <Sheet visible={!!removing} onClose={() => setRemoving(null)} title="Delete this chat?">
        <Text tone="muted" numberOfLines={2}>
          “{removing?.title}” will be removed from this phone. Cards you saved from it stay.
        </Text>
        <View className="mt-6 flex-row gap-3">
          <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={() => setRemoving(null)} />
          <Button label="Delete" variant="danger" size="lg" className="flex-1" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}
