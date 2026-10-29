import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useAuth } from '@/features/auth/useAuth';
import { askNow } from '@/features/chat/ask-now';
import { type Category, CATEGORY_NAME, type Element, ELEMENTS, elementSummary, searchElements } from '@/features/tools/services/elements';
import { useColor } from '@/hooks/use-color';

// Design T2: five groups from light to dark, so they differ in lightness, not only in hue.
const CELL: Record<Category, { bg: string; border: string; tone: 'ink' | 'paper' }> = {
  reactive: { bg: 'bg-ink/5', border: 'border-ink/20', tone: 'ink' },
  metal: { bg: 'bg-ink/10', border: 'border-transparent', tone: 'ink' },
  metalloid: { bg: 'bg-primary/20', border: 'border-transparent', tone: 'ink' },
  nonmetal: { bg: 'bg-primary/40', border: 'border-transparent', tone: 'ink' },
  noble: { bg: 'bg-primary', border: 'border-transparent', tone: 'paper' },
};
const box = (c: Category) => `border ${CELL[c].bg} ${CELL[c].border}`;

const CELL_STEP = 44; // w-10 cell + gap-1
const COLUMNS = Array.from({ length: 18 }, (_, i) => i + 1);
// Rows 1–7 are the main table; 9–10 hold the lanthanides and actinides, with row 8 as the gap.
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const AT = new Map(ELEMENTS.map((e) => [`${e.row}:${e.col}`, e]));
const CARBON = ELEMENTS[5];

/** Offline periodic table (design T2): search, tap an element for its details, ask Lucid about it. */
export default function PeriodicTable() {
  const { user } = useAuth();
  const placeholder = useColor('default');
  const table = useRef<ComponentRef<typeof ScrollView>>(null);
  const opened = useRef(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Element>(CARBON);
  const matches = new Set(searchElements(query).map((e) => e.number));

  const search = (text: string) => {
    setQuery(text);
    const first = text.trim() ? searchElements(text)[0] : undefined;
    if (!first) return;
    setSelected(first);
    // Bring the match into view; the table is wider than the phone.
    table.current?.scrollTo({ x: Math.max(0, (first.col - 4) * CELL_STEP), animated: true });
  };

  return (
    <Screen padded={false}>
      <Header title="Periodic table" />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-6" keyboardShouldPersistTaps="handled">
        <View className="min-h-11 flex-row items-center gap-3 rounded-sm bg-ink/5 px-4">
          <Icon name="Search" size={18} tone="muted" />
          <TextInput
            value={query}
            onChangeText={search}
            placeholder="Search name, symbol or number"
            placeholderTextColor={placeholder}
            accessibilityLabel="Search elements"
            returnKeyType="search"
            autoCorrect={false}
            className="min-h-11 flex-1 font-sans text-body text-ink"
          />
        </View>

        <View className="flex-row flex-wrap gap-x-3 gap-y-1" accessibilityLabel="Legend">
          {(Object.keys(CATEGORY_NAME) as Category[]).map((c) => (
            <View key={c} className="flex-row items-center gap-1">
              <View className={`h-3 w-3 rounded-sm ${box(c)}`} />
              <Text variant="caption" tone="muted" className="font-sans">
                {CATEGORY_NAME[c]}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          ref={table}
          horizontal
          // Opens on groups 11–18 like the design, where most school examples (C, N, O, Cl) sit.
          // Set after layout: contentOffset isn't reliable on Android.
          onLayout={() => {
            if (opened.current) return;
            opened.current = true;
            table.current?.scrollTo({ x: 10 * CELL_STEP, animated: false });
          }}
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-1 px-4">
          {ROWS.map((row) =>
            row === 8 ? (
              <View key={row} className="h-2" />
            ) : (
              <View key={row} className="flex-row gap-1">
                {COLUMNS.map((col) => {
                  const e = AT.get(`${row}:${col}`);
                  return e ? (
                    <Cell key={col} element={e} selected={e === selected} dim={!matches.has(e.number)} onPress={() => setSelected(e)} />
                  ) : (
                    <View key={col} className="h-11 w-10" />
                  );
                })}
              </View>
            ),
          )}
        </ScrollView>
        {query.trim() !== '' && matches.size === 0 && (
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            No element matches “{query.trim()}”.
          </Text>
        )}
        <View className="flex-row items-center gap-1">
          <Icon name="ChevronLeft" size={14} tone="muted" />
          <Text variant="caption" tone="muted" className="font-sans">
            Swipe for groups 1–10 · Lanthanides & actinides below
          </Text>
        </View>

        <Details element={selected} onAsk={() => user && askNow(user.uid, 'science', `Tell me about ${selected.name} (${selected.symbol}).`)} />
      </ScrollView>
    </Screen>
  );
}

function Cell({ element: e, selected, dim, onPress }: { element: Element; selected: boolean; dim: boolean; onPress: () => void }) {
  const style = CELL[e.category];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${e.name}, ${e.symbol}, atomic number ${e.number}, ${CATEGORY_NAME[e.category]}`}
      accessibilityState={{ selected }}
      className={`h-11 w-10 items-center justify-center rounded-sm active:opacity-80 ${style.bg} ${selected ? 'border-2 border-ink' : `border ${style.border}`} ${dim ? 'opacity-30' : ''}`}>
      {/* Fixed-size grid cells: scaled text would clip. The label above and the details card carry the scaled text. */}
      <Text variant="caption" tone={style.tone} allowFontScaling={false} className="font-sans opacity-70">
        {e.number}
      </Text>
      <Text variant="h3" tone={style.tone} allowFontScaling={false} className="font-bold">
        {e.symbol}
      </Text>
    </Pressable>
  );
}

function Details({ element: e, onAsk }: { element: Element; onAsk: () => void }) {
  const style = CELL[e.category];
  const facts = [
    { label: 'Atomic mass', value: e.mass },
    { label: 'Electrons', value: e.config },
    ...(e.valence !== null ? [{ label: 'Valence e⁻', value: String(e.valence) }] : []),
  ];
  return (
    <Card variant="outlined" className="gap-3 p-4">
      <View className="flex-row items-center gap-3" accessible accessibilityLabel={`${e.name}, ${elementSummary(e)}`}>
        <View className={`min-h-16 min-w-16 items-center justify-center rounded-md px-2 ${box(e.category)}`}>
          <Text variant="caption" tone={style.tone} className="font-sans">
            {e.number}
          </Text>
          <Text variant="display" tone={style.tone}>
            {e.symbol}
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <Text variant="h1" accessibilityRole="header">
            {e.name}
          </Text>
          <Text variant="small" tone="muted">
            {elementSummary(e)}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        {facts.map((f) => (
          <View key={f.label} className="flex-1 gap-1 rounded-md bg-ink/5 p-3">
            <Text variant="caption" tone="muted" className="font-sans">
              {f.label}
            </Text>
            <Text className="font-semibold">{f.value}</Text>
          </View>
        ))}
      </View>
      <Button
        label={`Ask Lucid about ${e.name.toLowerCase()}`}
        variant="secondary"
        icon={<Icon name="MessageCircle" size={16} tone="primary" />}
        onPress={onAsk}
      />
    </Card>
  );
}
