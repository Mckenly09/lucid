import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { SafeAreaView } from '@/components/screen';
import { Text } from '@/components/text';

const TABS = {
  index: { label: 'Home', icon: 'House' },
  ask: { label: 'Ask', icon: 'MessageCircle' },
  cards: { label: 'Cards', icon: 'Copy' },
  history: { label: 'History', icon: 'Clock' },
  library: { label: 'Library', icon: 'Book' },
} as const;

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} className="flex-row border-t border-ink/10 bg-paper px-2 pt-1.5">
      {state.routes.map((route, i) => {
        const tab = TABS[route.name as keyof typeof TABS];
        if (!tab) return null;
        const active = state.index === i;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigateToTab(route.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            className="min-h-11 flex-1 items-center gap-0.5 py-1.5">
            <Icon name={tab.icon} tone={active ? 'ink' : 'muted'} />
            <Text
              variant="caption"
              tone={active ? 'ink' : 'muted'}
              className={active ? 'font-semibold' : 'font-medium'}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}
