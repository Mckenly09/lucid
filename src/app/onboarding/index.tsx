import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Disclaimer } from '@/components/disclaimer';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { RiseIn, STAGGER } from '@/components/rise-in';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

const FEATURES = [
  {
    icon: 'WifiOff',
    title: 'Works offline',
    body: 'The AI runs on your phone after one download.',
  },
  {
    icon: 'BookOpen',
    title: 'Made for your subjects',
    body: 'Math, Science, English, Filipino and AP.',
  },
  {
    icon: 'Lock',
    title: 'Private',
    body: 'Your questions never leave your phone.',
  },
] as const;

export default function Welcome() {
  return (
    <Screen
      scroll
      footer={
        <RiseIn fade delay={260 + FEATURES.length * STAGGER} className="gap-3 px-4 pb-4 pt-3">
          <Button label="Get started" size="lg" onPress={() => router.push('/sign-in')} />
          <Disclaimer compact />
        </RiseIn>
      }>
      <View className="items-center gap-4 pt-12">
        <RiseIn>
          <Logo size="lg" />
        </RiseIn>
        <RiseIn delay={STAGGER}>
          <Text variant="display" className="text-center tracking-tight" accessibilityRole="header">
            Lucid
          </Text>
        </RiseIn>
        <RiseIn delay={STAGGER * 2} className="items-center">
          <Text tone="muted" className="max-w-75 text-center">
            Your offline study buddy. Ask anything about your subjects — no internet needed.
          </Text>
        </RiseIn>
      </View>
      <View className="mt-8 gap-3">
        {FEATURES.map((f, i) => (
          <RiseIn key={f.title} delay={200 + i * STAGGER}>
            <Card className="flex-row items-center gap-3">
              <Icon name={f.icon} size={24} tone="primary" />
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold">{f.title}</Text>
                <Text variant="small" tone="muted">
                  {f.body}
                </Text>
              </View>
            </Card>
          </RiseIn>
        ))}
      </View>
    </Screen>
  );
}
