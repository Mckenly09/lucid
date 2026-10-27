import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { formatSize, ModelCard, type ModelStatus } from '@/components/model-card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEMO_MODELS } from '@/features/demo-data';
import { useOnboarding } from '@/features/onboarding/store';

const GB = 1024 ** 3;

export default function Download() {
  const finish = useOnboarding((s) => s.finish);
  const network = useNetworkState();
  const ramGB = (Device.totalMemory ?? 0) / GB;
  const freeMB = Paths.availableDiskSpace / 1024 ** 2;
  const fits = (m: (typeof DEMO_MODELS)[number]) => ramGB === 0 || ramGB >= m.minRamGB;

  const [selected, setSelected] = useState(DEMO_MODELS[0].id);
  // shortcut: fake progress so the layout can be reviewed; replace with the resumable download in features/models.
  const [status, setStatus] = useState<ModelStatus>('downloading');
  const progress = 0.62;
  const model = DEMO_MODELS.find((m) => m.id === selected) ?? DEMO_MODELS[0];
  const canRun = fits(model) && freeMB > model.sizeMB;

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="flex-row gap-3 px-4 pb-2 pt-3">
          <Button
            label={status === 'paused' ? 'Resume' : 'Pause'}
            variant="secondary"
            size="lg"
            className="flex-1"
            onPress={() => setStatus(status === 'paused' ? 'downloading' : 'paused')}
          />
          <Button label="Continue" size="lg" className="flex-1" onPress={finish} />
        </View>
      }>
      <Header title="Step 2 of 2" subtle />
      <View className="flex-1 gap-6 px-4 pt-4">
        <View className="gap-2">
          <Text variant="display" accessibilityRole="header">
            Download Lucid&apos;s brain
          </Text>
          <Text variant="h3" tone="muted" className="font-sans">
            One download, then Lucid works without internet.
          </Text>
        </View>

        <Banner
          status={canRun ? 'success' : 'warning'}
          title={canRun ? 'Your phone can run Lucid' : 'Your phone may be too small for Lucid'}
          message={`${ramGB ? `${ramGB.toFixed(0)} GB` : 'Unknown'} memory · ${formatSize(freeMB)} storage free`}
          icon={
            <Icon
              ios={canRun ? 'checkmark.circle' : 'exclamationmark.triangle'}
              android={canRun ? 'check_circle' : 'warning'}
              size={28}
              className={canRun ? 'text-success' : 'text-warning'}
            />
          }
        />

        <View className="gap-3">
          {DEMO_MODELS.map((m, i) => (
            <ModelCard
              key={m.id}
              name={m.name}
              description={m.description}
              sizeMB={m.sizeMB}
              recommended={i === 0}
              tooBig={!fits(m)}
              selected={selected === m.id}
              onPress={() => setSelected(m.id)}
              status={selected === m.id ? status : 'available'}
              progress={progress}
              minutesLeft={2}
            />
          ))}
        </View>

        {network.type === NetworkStateType.CELLULAR && (
          <Banner
            status="warning"
            message="You're on mobile data. This may use your load — Wi-Fi is better."
            icon={<Icon ios="exclamationmark.triangle" android="warning" size={28} className="text-warning" />}
          />
        )}
      </View>
    </Screen>
  );
}
