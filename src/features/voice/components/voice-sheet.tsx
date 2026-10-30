import { useMicrophonePermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text as RNText, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { Waveform } from '@/components/waveform';
import { useSettings, type VoiceLanguage } from '@/features/settings/store';
import { useColor } from '@/hooks/use-color';

import { LEVELS, useListening } from '../hooks/use-listening';
import { splitLive } from '../services/audio';
import { useVoicePacks } from '../store';
import { VoicePacks } from './voice-packs';

const LANGUAGES: { id: VoiceLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'tl', label: 'Filipino' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The spoken question, sent as typed text would be. */
  onText: (text: string) => void;
};

/** Mic flow (v2.md §4): download a voice pack the first time, ask for the mic, then listen. */
export function VoiceSheet({ visible, onClose, onText }: Props) {
  const installed = useVoicePacks((s) => s.installedId);
  return (
    <Sheet visible={visible} onClose={onClose} title={installed ? undefined : 'Download voice pack'}>
      {installed ? (
        <MicGate onClose={onClose} onText={onText} />
      ) : (
        <View className="gap-4">
          <Text tone="muted">One download, then you can ask by voice in English or Filipino, even offline.</Text>
          <VoicePacks />
        </View>
      )}
    </Sheet>
  );
}

/** Asks for the mic when the student first taps it, never at app start (v2.md §1). */
function MicGate({ onClose, onText }: Omit<Props, 'visible'>) {
  const [permission, requestPermission] = useMicrophonePermissions();
  const requested = useRef(false);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (requested.current || !permission || permission.granted || !permission.canAskAgain) return;
    requested.current = true;
    void requestPermission().finally(() => setAsked(true));
  }, [permission, requestPermission]);

  if (permission?.granted) return <Listening onClose={onClose} onText={onText} />;
  if (!permission || (!asked && permission.canAskAgain)) return <View className="h-12" />;
  return (
    <View className="gap-3">
      <Banner
        status="warning"
        title="Microphone is off for Lucid"
        message="Allow the microphone to ask by voice, or type your question."
      />
      {permission.canAskAgain ? (
        <Button label="Allow microphone" variant="outline" onPress={() => void requestPermission()} />
      ) : (
        <Button label="Open settings" variant="outline" onPress={() => void Linking.openSettings()} />
      )}
    </View>
  );
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Listening({ onClose, onText }: Omit<Props, 'visible'>) {
  const language = useSettings((s) => s.voiceLanguage);
  const setSettings = useSettings((s) => s.set);
  const spinner = useColor('ink');
  const { phase, elapsedMs, levels, transcript, pause, resume, cancel, finish } = useListening({
    language,
    onDone: (text) => {
      onClose();
      if (text) onText(text);
    },
  });
  const { done, pending } = splitLive(transcript);
  const working = phase === 'loading' || phase === 'finishing';

  if (phase === 'error') {
    return (
      <View className="gap-3">
        <Banner
          status="danger"
          message="Couldn't listen just now. Try again, or type your question."
          icon={<Icon name="CircleAlert" size={22} tone="danger" />}
        />
        <Button label="Close" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
          {phase === 'listening' && <View className="h-3 w-3 rounded-full bg-danger" />}
          <Text variant="h3">
            {phase === 'loading'
              ? 'Getting ready…'
              : phase === 'paused'
                ? 'Paused'
                : phase === 'finishing'
                  ? 'Writing it down…'
                  : 'Listening…'}
          </Text>
          <Text variant="h3" tone="muted" className="font-sans">
            {clock(elapsedMs)}
          </Text>
        </View>
        <Segmented
          label="Voice language"
          value={language}
          onChange={(voiceLanguage) => setSettings({ voiceLanguage })}
          options={LANGUAGES}
        />
      </View>

      <View className="min-h-24 justify-center">
        {transcript ? (
          <Text variant="h2">
            {done}
            {/* The last word may still change while the student talks. */}
            <RNText className={phase === 'listening' ? 'text-ink/40' : 'text-ink'}>{pending}</RNText>
          </Text>
        ) : working ? (
          <ActivityIndicator color={spinner} />
        ) : (
          <Text variant="h2" tone="muted">
            Say your question…
          </Text>
        )}
      </View>

      <Waveform levels={levels} bars={LEVELS} />

      <View className="flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel="Cancel"
          onPress={() => {
            cancel();
            onClose();
          }}
          className="h-14 w-14 bg-ink/5"
          icon={<Icon name="X" size={24} />}
        />
        <IconButton
          variant="filled"
          accessibilityLabel="Done, ask this question"
          onPress={finish}
          disabled={working}
          className="h-20 w-20"
          icon={<Icon name="Check" size={32} tone="paper" />}
        />
        {phase === 'paused' ? (
          <IconButton
            accessibilityLabel="Keep listening"
            onPress={resume}
            className="h-14 w-14 bg-ink/5"
            icon={<Icon name="Play" size={24} />}
          />
        ) : (
          <IconButton
            accessibilityLabel="Pause"
            onPress={pause}
            disabled={phase !== 'listening'}
            className="h-14 w-14 bg-ink/5"
            icon={<Icon name="Pause" size={24} />}
          />
        )}
      </View>

      <View className="flex-row items-center justify-center gap-2">
        <Icon name="Lock" size={16} tone="muted" />
        <Text variant="small" tone="muted">
          Runs on your phone. Your voice is never saved or sent.
        </Text>
      </View>
    </View>
  );
}
