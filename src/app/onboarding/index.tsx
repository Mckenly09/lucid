import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Disclaimer } from '@/components/disclaimer';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

const FEATURES = [
  { ios: 'wifi.slash', android: 'wifi_off', title: 'Works offline', body: 'The AI runs on your phone after one download.' },
  { ios: 'doc.text', android: 'description', title: 'Made for your subjects', body: 'Math, Science, English, Filipino and AP.' },
  { ios: 'lock', android: 'lock', title: 'Private', body: 'Your questions never leave your phone.' },
] as const;

export default function Welcome() {
  return (
    <Screen
      scroll
      footer={
        <View className="gap-4 px-4 pb-2 pt-3">
          <Button label="Get started" size="lg" onPress={() => router.push('/sign-in')} />
          <Disclaimer compact />
        </View>
      }>
      <View className="items-center gap-4 pt-12">
        <Logo size="lg" />
        <Text variant="display" className="text-center" accessibilityRole="header">
          Lucid
        </Text>
        <Text variant="h3" tone="muted" className="text-center font-sans">
          Your offline study buddy. Ask anything about your subjects — no internet needed.
        </Text>
      </View>
      <View className="mt-8 gap-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="flex-row items-center gap-4">
            <Icon ios={f.ios} android={f.android} size={24} />
            <View className="flex-1">
              <Text variant="h3">{f.title}</Text>
              <Text tone="muted">{f.body}</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
