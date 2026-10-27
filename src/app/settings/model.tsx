import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { formatSize, ModelCard, type ModelStatus } from '@/components/model-card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useChat } from '@/features/chat/store';
import { hasRoom, STORAGE_MARGIN_BYTES } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import * as engine from '@/llm/engine';
import { type Model, MODELS } from '@/llm/models';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Settings → AI model: see what's installed, switch by downloading the other model, or reload a stuck one. */
export default function AiModel() {
  const { installedId, activeId, status, progress, start, pause, resume } = useModels();
  const network = useNetworkState();
  const [reloaded, setReloaded] = useState(false);
  const ramGB = (Device.totalMemory ?? 0) / GB;
  const freeBytes = Paths.availableDiskSpace;
  const offline = network.isInternetReachable === false;
  const downloading = status === 'downloading' || status === 'paused';

  const statusOf = (m: Model): ModelStatus => {
    if (m.id === installedId) return 'ready';
    if (m.id === activeId && status !== 'ready') return status;
    return 'available';
  };

  // Frees the model's memory; the next question loads it again from the file.
  const reload = () => {
    useChat.getState().stop();
    engine.unload();
    setReloaded(true);
  };

  return (
    <Screen scroll padded={false}>
      <Header title="AI model" />
      <View className="gap-4 px-4 pb-8 pt-2">
        <View className="flex-row gap-2">
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="muted">
              Phone memory
            </Text>
            <Text variant="h3">{ramGB ? `${ramGB.toFixed(0)} GB` : 'Unknown'}</Text>
          </Card>
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="muted">
              Free storage
            </Text>
            <Text variant="h3">{formatSize(freeBytes / MB)}</Text>
          </Card>
        </View>

        {MODELS.map((m) => {
          const s = statusOf(m);
          const tooBig = ramGB > 0 && ramGB < m.minRamGB;
          const room = hasRoom(m, freeBytes);
          return (
            <View key={m.id} className="gap-2">
              <ModelCard
                name={m.name}
                description={m.description}
                sizeMB={m.sizeBytes / MB}
                status={s}
                progress={progress}
                tooBig={tooBig}
                selected={m.id === installedId}
              />
              {s === 'downloading' && <Button label="Pause" variant="secondary" onPress={pause} className="self-start" />}
              {s === 'paused' && <Button label="Resume" disabled={offline} onPress={resume} className="self-start" />}
              {(s === 'available' || s === 'failed') && (
                <Button
                  label={`${s === 'failed' ? 'Try again' : 'Download'} · ${formatSize(m.sizeBytes / MB)}`}
                  variant="secondary"
                  // One download at a time; a paused one can be switched by starting this one.
                  disabled={offline || !room || status === 'downloading'}
                  onPress={() => start(m)}
                  className="self-start"
                />
              )}
              {!room && s === 'available' && (
                <Text variant="small" tone="warning">
                  Not enough storage. Free up {formatSize((m.sizeBytes + STORAGE_MARGIN_BYTES - freeBytes) / MB)} to download it.
                </Text>
              )}
            </View>
          );
        })}

        {offline && downloading ? (
          <Banner
            status="warning"
            message="Connect to the internet to finish the download."
            icon={<Icon name="WifiOff" size={22} tone="warning" />}
          />
        ) : (
          network.type === NetworkStateType.CELLULAR && (
            <Banner
              status="warning"
              message="You're on mobile data. Downloading may use your load — Wi-Fi is better."
              icon={<Icon name="TriangleAlert" size={22} tone="warning" />}
            />
          )
        )}

        <Text variant="small" tone="muted">
          Only one model runs at a time. A new model replaces the old one when its download finishes — your chats and
          cards stay.
        </Text>

        {installedId && (
          <View className="mt-4 gap-2">
            <Text variant="small" tone="muted" className="text-center">
              Answers seem wrong or slow?
            </Text>
            <Button label={reloaded ? 'Model reloads on your next question' : 'Reload model'} variant="secondary" size="lg" disabled={reloaded} onPress={reload} />
          </View>
        )}
      </View>
    </Screen>
  );
}
