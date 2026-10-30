import { View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useSettings } from '@/features/settings/store';
import { type Cluster, CLUSTER_NAME, COURSES } from '@/llm/subjects/courses';

const CLUSTERS = Object.keys(CLUSTER_NAME) as Cluster[];

/** Settings → My electives: the picked ones join their subject's course chips on Ask. */
export default function Electives() {
  const electives = useSettings((s) => s.electives);
  const set = useSettings((s) => s.set);
  const toggle = (id: string, on: boolean) =>
    set({ electives: on ? [...electives, id] : electives.filter((e) => e !== id) });

  return (
    <Screen scroll padded={false}>
      <Header title="My electives" />
      <View className="gap-6 px-4 pb-8 pt-2">
        <Text tone="muted">Pick the electives you take. They show up as courses when you choose a subject on Ask.</Text>
        {CLUSTERS.map((cluster) => (
          <View key={cluster} className="gap-1">
            <Text variant="h3" accessibilityRole="header">
              {CLUSTER_NAME[cluster]}
            </Text>
            {COURSES.filter((c) => c.cluster === cluster).map((c) => (
              <Checkbox
                key={c.id}
                checked={electives.includes(c.id)}
                onChange={(on) => toggle(c.id, on)}
                accessibilityLabel={c.name}>
                {c.name}
              </Checkbox>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
