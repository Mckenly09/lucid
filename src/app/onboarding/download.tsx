import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { formatSize, ModelCard } from '@/components/model-card';
import { RiseIn, STAGGER } from '@/components/rise-in';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { hasRoom } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import { useOnboarding } from '@/features/onboarding/store';
import { usePlus } from '@/features/plus/usePlus';
import { type Model, MODELS, modelById, recommendedModel } from '@/llm/models';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

export default function Download() {
  const finish = useOnboarding((s) => s.finish);
  const { isPlus } = usePlus();
  const { activeId, status, progress, start, pause, resume } = useModels();
  const network = useNetworkState();
  const ramGB = (Device.totalMemory ?? 0) / GB;
  const freeBytes = Paths.availableDiskSpace;
  const fits = (m: Model) => ramGB === 0 || ramGB >= m.minRamGB;
  // Onboarding installs the best free model; the paid one is offered later in Settings -> AI model.
  const options = MODELS.filter((m) => !m.plus || isPlus);
  const recommended = recommendedModel(ramGB, options);

  const [picked, setPicked] = useState(
    activeId && options.some((m) => m.id === activeId) ? activeId : recommended.id,
  );
  const model = modelById(picked);
  // The store's status belongs to the active model; another picked model hasn't started yet.
  const current = picked === activeId ? status : 'available';
  // Cards lock while a download runs or is done; Pause unlocks them to switch models.
  const busy = status === 'downloading' || status === 'ready';
  const room = hasRoom(model, freeBytes);
  const canRun = fits(model) && room;
  const offline = network.isInternetReachable === false;
  const onWifi = network.type === NetworkStateType.WIFI && !offline;

  // The model is the one thing Lucid needs, so start it as soon as setup opens, but only on Wi-Fi:
  // on mobile data the student taps Download after seeing the size (AGENTS.md LLM rule 6). Once per visit,
  // so a Pause isn't undone.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !onWifi || !canRun) return;
    if (current === 'available') start(model);
    else if (current === 'paused') resume();
    else return;
    autoStarted.current = true;
  }, [onWifi, canRun, current, model, start, resume]);

  const action =
    current === 'ready' ? (
      <Button label="Continue" size="lg" className="flex-1" onPress={finish} />
    ) : current === 'downloading' ? (
      <Button label="Pause" variant="secondary" size="lg" className="flex-1" onPress={pause} />
    ) : current === 'paused' ? (
      <Button label="Resume" size="lg" className="flex-1" disabled={offline} onPress={resume} />
    ) : (
      <Button
        label={`${current === 'failed' ? 'Try again' : 'Download'} · ${formatSize(model.sizeBytes / MB)}`}
        size="lg"
        className="flex-1"
        disabled={!room || offline}
        onPress={() => start(model)}
      />
    );

  return (
    <Screen scroll padded={false} footer={<View className="flex-row gap-3 px-4 pb-8 pt-3">{action}</View>}>
      <Header title="Step 2 of 2" subtle />
      <View className="flex-1 gap-6 px-4 pt-2">
        <RiseIn className="gap-2">
          <Text variant="h1" accessibilityRole="header">
            Download Lucid&apos;s brain
          </Text>
          <Text tone="muted">One download, then Lucid works without internet.</Text>
        </RiseIn>

        <RiseIn delay={STAGGER}>
          <Banner
            status={canRun ? 'success' : 'warning'}
            title={
              canRun
                ? 'Your phone can run Lucid'
                : room
                  ? 'Your phone may be too small for this model'
                  : 'Not enough storage'
            }
            message={`${ramGB ? `${ramGB.toFixed(0)} GB` : 'Unknown'} memory · ${formatSize(freeBytes / MB)} storage free`}
            icon={
              <Icon name={canRun ? 'CircleCheck' : 'TriangleAlert'} size={22} tone={canRun ? 'success' : 'warning'} />
            }
          />
        </RiseIn>

        <View className="gap-3">
          {options.map((m, i) => (
            <RiseIn key={m.id} delay={STAGGER * (2 + i)}>
              <ModelCard
                name={m.name}
                description={m.description}
                sizeMB={m.sizeBytes / MB}
                recommended={m.id === recommended.id}
                tooBig={!fits(m)}
                selected={picked === m.id}
                // Locked while a download is running or done; a failed card retries on tap.
                onPress={busy ? undefined : () => (current === 'failed' && picked === m.id ? start(m) : setPicked(m.id))}
                status={picked === m.id ? current : 'available'}
                progress={progress}
              />
            </RiseIn>
          ))}
        </View>

        {offline && status !== 'ready' ? (
          <RiseIn fade>
            <Banner
              status="warning"
              message="Connect to the internet to download. You only need it once."
              icon={<Icon name="WifiOff" size={22} tone="warning" />}
            />
          </RiseIn>
        ) : (
          network.type === NetworkStateType.CELLULAR &&
          status !== 'ready' && (
            <RiseIn fade>
              <Banner
                status="warning"
                message="You're on mobile data. This may use your load — Wi-Fi is better."
                icon={<Icon name="TriangleAlert" size={22} tone="warning" />}
              />
            </RiseIn>
          )
        )}
      </View>
    </Screen>
  );
}
