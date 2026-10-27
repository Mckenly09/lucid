import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ListItem, SubjectCode } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import type { ChatSummary } from '@/db/chats';
import { groupOf, timeLabel } from '@/features/history/services/when';
import { useChats } from '@/features/history/useChats';
import { useColor } from '@/hooks/use-color';
import { subject } from '@/llm/subjects/config';

type Row = { kind: 'group'; title: string } | { kind: 'item'; item: ChatSummary };

export default function History() {
  const [query, setQuery] = useState('');
  const placeholderColor = useColor('default');

  const q = query.trim();
  const items = useChats(q);
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
            title={q ? 'No matches' : 'No questions yet'}
            message={q ? 'Try a different word.' : 'Your questions will show up here, saved on this phone.'}
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
            />
          )
        }
      />
    </Screen>
  );
}
