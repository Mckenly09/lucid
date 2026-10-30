import { Paths } from 'expo-file-system';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ListItem, SubjectCode } from '@/components/list-item';
import { formatSize } from '@/components/model-card';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { createUserPack } from '@/db/user-packs';
import { useAuth } from '@/features/auth/useAuth';
import { type PackForm, PackFormSheet } from '@/features/knowledge/components/PackFormSheet';
import { type CatalogPack, gradesLabel } from '@/features/knowledge/services/catalog';
import { usePacks } from '@/features/knowledge/store';
import { useUserPacks } from '@/features/knowledge/useUserPacks';
import { STORAGE_MARGIN_BYTES } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import { modelById } from '@/llm/models';
import { VoicePacks } from '@/features/voice/components/voice-packs';
import { voicePackById } from '@/features/voice/packs';
import { useVoicePacks } from '@/features/voice/store';
import { subject } from '@/llm/subjects/config';

const MB = 1024 ** 2;

type RowStatus = 'installed' | 'update' | 'downloading' | 'paused' | 'failed' | 'available';

export default function Library() {
  const { user } = useAuth();
  const { packs: myPacks } = useUserPacks();
  const [creating, setCreating] = useState<PackForm | null>(null);
  const [details, setDetails] = useState<CatalogPack | null>(null);
  const network = useNetworkState();
  const offline = network.isInternetReachable === false;

  const { catalog, catalogStatus, installed, active, status, progress } = usePacks();
  const { refreshCatalog, download, pause, resume, remove } = usePacks.getState();

  // The only network use here: the small pack list, fetched when Library opens online (AGENTS.md offline rules).
  useFocusEffect(
    useCallback(() => {
      if (!offline) void usePacks.getState().refreshCatalog();
    }, [offline]),
  );

  const create = (pack: PackForm) => {
    setCreating(null);
    if (!user) return;
    try {
      const id = createUserPack(user.uid, pack);
      router.push({ pathname: '/packs/[id]', params: { id } });
    } catch (e) {
      console.warn('Could not create pack', e instanceof Error ? e.message : e);
    }
  };

  const freeBytes = Paths.availableDiskSpace;
  const freeMB = freeBytes / MB;
  const installedId = useModels((s) => s.installedId);
  const voiceId = useVoicePacks((s) => s.installedId);
  // The voice pack counts with the AI model: both are on-device models.
  const modelMB = ((installedId ? modelById(installedId).sizeBytes : 0) + (voiceId ? voicePackById(voiceId).sizeBytes : 0)) / MB;
  const packsMB = Object.values(installed).reduce((sum, p) => sum + p.sizeMB, 0);
  const totalMB = modelMB + packsMB + freeMB;

  // Catalog packs, plus installed ones the catalog no longer lists (so they can still be deleted).
  const rows = [...(catalog ?? []), ...Object.values(installed).filter((p) => !catalog?.some((c) => c.id === p.id))];
  const busy = status === 'downloading';
  const statusOf = (p: CatalogPack): RowStatus => {
    if (active?.id === p.id && status) return status;
    const mine = installed[p.id];
    if (mine) return p.version > mine.version ? 'update' : 'installed';
    return 'available';
  };
  const room = (p: CatalogPack) => freeBytes >= p.sizeMB * MB + STORAGE_MARGIN_BYTES;

  const action = (p: CatalogPack) => {
    const s = statusOf(p);
    switch (s) {
      case 'installed':
        return <Badge label="Installed" status="success" />;
      case 'update':
        return <Badge label="Update" status="warning" onPress={offline || busy ? undefined : () => download(p)} />;
      case 'downloading':
        return <Badge label={`${Math.round(progress * 100)}% · Pause`} status="primary" onPress={pause} />;
      case 'paused':
        return <Badge label="Resume" status="primary" onPress={offline ? undefined : resume} />;
      case 'failed':
        return <Badge label="Retry" status="danger" onPress={offline || busy ? undefined : () => download(p)} />;
      case 'available':
        return <Button label="Download" size="sm" disabled={offline || busy || !room(p)} onPress={() => download(p)} />;
    }
  };

  const listEmpty =
    catalogStatus === 'loading' ? (
      <Text tone="muted">Checking for subject packs…</Text>
    ) : catalogStatus === 'error' || offline ? (
      <Card className="gap-3">
        <Text variant="small" tone="muted">
          {offline
            ? 'Connect to the internet once to see subject packs. After you download one, it works offline.'
            : "Couldn't load subject packs. Check your internet, then try again."}
        </Text>
        {!offline && <Button label="Try again" variant="secondary" onPress={() => void refreshCatalog()} className="self-start" />}
      </Card>
    ) : (
      <Text tone="muted">No subject packs yet.</Text>
    );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View className="gap-6 pt-6">
            <View className="gap-1">
              <Text variant="h1" accessibilityRole="header">
                Library
              </Text>
              <Text tone="muted">Subject packs make answers more accurate.</Text>
            </View>
            <Card className="gap-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="small" className="font-semibold">
                  Storage
                </Text>
                <Text variant="small" tone="muted">
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
              <View className="flex-row gap-4">
                <Legend dot="bg-primary" label="AI and voice" />
                <Legend dot="bg-default" label="Subject packs" />
              </View>
            </Card>

            {/* A student has a handful of packs, so a plain list here; their notes use a FlatList (packs/[id]). */}
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text variant="label">My packs</Text>
                <Button
                  label="New pack"
                  variant="secondary"
                  size="sm"
                  icon={<Icon name="Plus" size={16} tone="primary" />}
                  onPress={() => setCreating({ name: '', subject: 'general' })}
                />
              </View>
              {myPacks.length === 0 ? (
                <Card className="flex-row items-center gap-3">
                  <Icon name="BookOpen" size={22} tone="muted" />
                  <Text variant="small" tone="muted" className="flex-1">
                    Add your own notes: type, paste, or import a .txt or .md file. Lucid reads them when you ask.
                  </Text>
                </Card>
              ) : (
                myPacks.map((p) => (
                  <ListItem
                    key={p.id}
                    title={p.name}
                    subtitle={`${subject(p.subject).short} · ${p.notes === 1 ? '1 note' : `${p.notes} notes`}`}
                    left={<SubjectCode code={subject(p.subject).code} />}
                    right={<Icon name="ChevronRight" size={18} tone="muted" />}
                    onPress={() => router.push({ pathname: '/packs/[id]', params: { id: p.id } })}
                  />
                ))
              )}
            </View>

            <View className="gap-3">
              <View className="gap-1">
                <Text variant="label">Voice</Text>
                <Text variant="small" tone="muted">
                  Ask by voice in English or Filipino. Pick one; it runs on your phone.
                </Text>
              </View>
              <VoicePacks />
            </View>

            <View className="gap-3">
              <Text variant="label">Subject packs</Text>
              {network.type === NetworkStateType.CELLULAR && rows.some((p) => statusOf(p) !== 'installed') && (
                <Banner
                  status="warning"
                  message="You're on mobile data. Downloading may use your load — Wi-Fi is better."
                  icon={<Icon name="TriangleAlert" size={22} tone="warning" />}
                />
              )}
            </View>
          </View>
        }
        ListEmptyComponent={listEmpty}
        renderItem={({ item: p }) => (
          <ListItem
            title={p.name}
            subtitle={`${gradesLabel(p.grades)} · ${formatSize(p.sizeMB)} · ${p.license}${
              statusOf(p) === 'available' && !room(p) ? ' · not enough storage' : ''
            }`}
            left={<SubjectCode code={subject(p.subject).code} />}
            right={action(p)}
            onPress={() => setDetails(installed[p.id] ?? p)}
          />
        )}
      />

      <PackFormSheet initial={creating} title="New pack" onSave={create} onClose={() => setCreating(null)} />
      <Sheet visible={!!details} onClose={() => setDetails(null)} title={details?.name}>
        {details && (
          <View className="gap-3 pt-1">
            <Text variant="small" tone="muted">
              {gradesLabel(details.grades)} · {formatSize(details.sizeMB)} · version {details.version}
            </Text>
            <View className="gap-1">
              <Text variant="label">License</Text>
              <Text>{details.license}</Text>
            </View>
            <View className="gap-1">
              <Text variant="label">Source</Text>
              <Text variant="small" tone="muted">
                {details.attribution}
              </Text>
            </View>
            {installed[details.id] && (
              <Button
                label="Delete pack"
                variant="danger"
                size="lg"
                className="mt-3"
                onPress={() => {
                  remove(details.id);
                  setDetails(null);
                }}
              />
            )}
            <Button label="Close" variant="secondary" size="lg" onPress={() => setDetails(null)} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-full ${dot}`} />
      <Text variant="caption" tone="muted" className="font-sans">
        {label}
      </Text>
    </View>
  );
}
