import { Paths } from 'expo-file-system';
import { FlatList, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ListItem, SubjectTile } from '@/components/list-item';
import { formatSize } from '@/components/model-card';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEMO_MODELS, DEMO_PACKS, type PackStatus } from '@/features/demo-data';
import { subject } from '@/llm/subjects/config';

// shortcut: pack actions are no-ops until knowledge-pack downloads exist (features/knowledge).
const noop = () => {};

function PackAction({ status }: { status: PackStatus }) {
  switch (status) {
    case 'installed':
      return <Badge label="Installed" status="success" />;
    case 'update':
      return <Badge label="Update" status="warning" onPress={noop} />;
    case 'failed':
      return <Badge label="Retry" status="danger" onPress={noop} />;
    case 'available':
      return <Button label="Download" size="sm" onPress={noop} />;
  }
}

export default function Library() {
  const freeMB = Paths.availableDiskSpace / 1024 ** 2;
  const modelMB = DEMO_MODELS[0].sizeMB;
  const packsMB = DEMO_PACKS.filter((p) => p.status === 'installed').reduce((s, p) => s + p.sizeMB, 0);
  const totalMB = modelMB + packsMB + freeMB;

  return (
    <Screen edges={['top']}>
      <FlatList
        data={DEMO_PACKS}
        keyExtractor={(p) => p.subject}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View className="gap-6 pb-2 pt-4">
            <View className="gap-1">
              <Text variant="display" accessibilityRole="header">Library</Text>
              <Text variant="h3" tone="muted" className="font-sans">Subject packs make answers more accurate.</Text>
            </View>
            <Card className="gap-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="h3">Storage</Text>
                <Text tone="muted">
                  Lucid uses {formatSize(modelMB + packsMB)} · {formatSize(freeMB)} free
                </Text>
              </View>
              <ProgressBar
                label="Storage used by Lucid"
                value={[
                  { value: modelMB / totalMB, status: 'primary' },
                  { value: packsMB / totalMB, status: 'default' },
                ]}
              />
              <View className="flex-row gap-6">
                <Legend dot="bg-primary" label="AI model" />
                <Legend dot="bg-default" label="Subject packs" />
              </View>
            </Card>
            <Text variant="label">Subject packs</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <ListItem
            title={subject(p.subject).name}
            subtitle={p.status === 'installed' || p.status === 'available' ? `${p.detail} · ${formatSize(p.sizeMB)}` : p.detail}
            left={<SubjectTile code={subject(p.subject).code} />}
            right={<PackAction status={p.status} />}
          />
        )}
      />
    </Screen>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={`h-3 w-3 rounded-full ${dot}`} />
      <Text tone="muted">{label}</Text>
    </View>
  );
}
