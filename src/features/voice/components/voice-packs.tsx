import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { formatSize, ModelCard, type ModelStatus } from '@/components/model-card';
import { hasRoom } from '@/features/models/services/files';

import { recommendedVoicePack, type VoicePack, VOICE_PACKS } from '../packs';
import { useVoicePacks } from '../store';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Both voice packs with Download / Pause / Resume, like Settings → AI model. Used in Library and the mic's sheet. */
export function VoicePacks() {
  const { installedId, activeId, status, progress, start, pause, resume } = useVoicePacks();
  const network = useNetworkState();
  const ramGB = (Device.totalMemory ?? 0) / GB;
  const freeBytes = Paths.availableDiskSpace;
  const offline = network.isInternetReachable === false;
  const recommended = recommendedVoicePack(ramGB).id;

  const statusOf = (p: VoicePack): ModelStatus => {
    if (p.id === installedId) return 'ready';
    if (p.id === activeId && status !== 'ready') return status;
    return 'available';
  };

  return (
    <View className="gap-3">
      {VOICE_PACKS.map((p) => {
        const s = statusOf(p);
        const room = hasRoom(p, freeBytes);
        return (
          <View key={p.id} className="gap-2">
            <ModelCard
              name={p.name}
              description={p.description}
              sizeMB={p.sizeBytes / MB}
              status={s}
              progress={progress}
              recommended={!installedId && p.id === recommended}
              selected={p.id === installedId}
            />
            {s === 'downloading' && <Button label="Pause" variant="secondary" onPress={pause} className="self-start" />}
            {s === 'paused' && <Button label="Resume" disabled={offline} onPress={resume} className="self-start" />}
            {(s === 'available' || s === 'failed') && (
              <Button
                label={`${s === 'failed' ? 'Try again' : 'Download'} · ${formatSize(p.sizeBytes / MB)}`}
                variant="secondary"
                disabled={offline || !room || status === 'downloading'}
                onPress={() => start(p)}
                className="self-start"
              />
            )}
          </View>
        );
      })}
      {offline ? (
        <Banner
          status="warning"
          message="Connect to the internet to download a voice pack. After that, voice works offline."
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
    </View>
  );
}
