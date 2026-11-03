import { View } from 'react-native';

import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { VoicePacks } from '@/features/voice/components/voice-packs';

/** Settings → Voice: download or switch the on-device voice pack (like Settings → AI model). */
export default function VoiceSettings() {
  return (
    <Screen scroll padded={false}>
      <Header title="Voice" />
      <View className="gap-4 px-4 pb-8 pt-2">
        <Text tone="muted">Ask by voice in English or Filipino. Pick one; it runs on your phone.</Text>
        <VoicePacks />
      </View>
    </Screen>
  );
}
