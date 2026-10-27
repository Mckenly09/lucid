import { Linking, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

// Same env var as the sign-in screen; the button hides until it's set (auth.md §5).
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

const SECTIONS = [
  { title: 'What stays on your phone', body: 'Your questions, answers, chats, flashcards and quiz scores. We can’t see them.' },
  { title: 'What your account uses', body: 'Your name, email and photo from Google, so you can sign in. Nothing else.' },
  { title: 'When Lucid uses the internet', body: 'Only to sign in and to download the AI model and subject packs.' },
  {
    title: 'No ads, no tracking',
    body: 'Lucid doesn’t show ads or sell your data. You can delete your account anytime in Settings.',
  },
];

export default function Privacy() {
  return (
    <Screen
      scroll
      padded={false}
      footer={
        PRIVACY_URL && (
          <View className="px-4 pb-8 pt-3">
            <Button
              label="Read the full privacy policy"
              variant="secondary"
              size="lg"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
            />
          </View>
        )
      }>
      <Header title="Privacy" />
      <View className="gap-6 px-4 pb-8 pt-2">
        <Banner
          status="success"
          title="Your questions never leave your phone."
          message="The AI runs on your device, not on a server."
          icon={<Icon name="Lock" size={22} tone="success" />}
        />
        {SECTIONS.map((s) => (
          <View key={s.title} className="gap-1">
            <Text variant="h3" accessibilityRole="header">
              {s.title}
            </Text>
            <Text tone="muted">{s.body}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
