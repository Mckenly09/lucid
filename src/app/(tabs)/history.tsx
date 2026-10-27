import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ListItem, SubjectTile } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEMO_HISTORY, type HistoryItem } from '@/features/demo-data';
import { useColor } from '@/hooks/use-color';
import { subject } from '@/llm/subjects/config';

type Row = { kind: 'group'; title: string } | { kind: 'item'; item: HistoryItem };

export default function History() {
  const [query, setQuery] = useState('');
  const placeholderColor = useColor('default');

  // shortcut: filters demo rows in JS; switch to the SQLite query when history is stored.
  const q = query.trim().toLowerCase();
  const items = DEMO_HISTORY.filter((h) => !q || `${h.question} ${h.preview}`.toLowerCase().includes(q));
  const rows: Row[] = [];
  items.forEach((item, i) => {
    if (item.group !== items[i - 1]?.group) rows.push({ kind: 'group', title: item.group });
    rows.push({ kind: 'item', item });
  });

  return (
    <Screen edges={['top']}>
      <Text variant="display" accessibilityRole="header" className="pt-4">History</Text>
      <View className="mt-4 min-h-14 flex-row items-center gap-3 rounded-md bg-ink/5 px-4">
        <Icon ios="magnifyingglass" android="search" className="text-ink/60" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your questions"
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Search your questions"
          returnKeyType="search"
          className="flex-1 py-3 font-sans text-h3 text-ink"
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
            <Text variant="label" className="mb-1 mt-6">{r.title}</Text>
          ) : (
            <ListItem
              title={r.item.question}
              subtitle={r.item.preview}
              left={<SubjectTile code={subject(r.item.subject).code} />}
              right={<Text tone="muted">{r.item.time}</Text>}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: r.item.id } })}
            />
          )
        }
      />
    </Screen>
  );
}
