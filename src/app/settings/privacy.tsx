import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

// The full privacy policy lives here, in the app, so it works offline. Opens from Settings and from sign-in.
const UPDATED = '28 October 2026';

const SECTIONS = [
  {
    title: 'What stays on your phone',
    body: 'Your questions, answers, chats, flashcards, quiz scores, your own notes and your settings. They are stored only on this phone. Lucid never sends them to us or to anyone else, and we can’t see them.',
  },
  {
    title: 'If you sign in with Google',
    body: 'Lucid uses Google Firebase Authentication to sign you in. It gets your name, email, profile photo and a Google account ID. Google keeps this sign-in account on its servers; Lucid uses it only to know it’s you. Nothing else about you is collected.',
  },
  {
    title: 'If you continue without an account',
    body: 'Lucid makes a profile on this phone with the first name you type, if any. Nothing is sent anywhere.',
  },
  {
    title: 'When Lucid uses the internet',
    body: 'Only to sign in with Google, to download the AI model (from Hugging Face) and to download subject packs (from GitHub). Like any website, these services see your IP address when you download. Your questions are never sent.',
  },
  {
    title: 'No ads, no tracking',
    body: 'Lucid has no ads, no analytics and no tracking, and we don’t sell or share your data.',
  },
  {
    title: 'Reminders and backups',
    body: 'Review reminders are set on your phone. Export makes a backup file on your phone, and it goes only where you choose to share it.',
  },
  {
    title: 'Deleting your data',
    body: 'Settings → Delete account and data removes your Google sign-in account and your chats, cards and scores from this phone. Settings → Remove offline profile does the same for a profile without an account. Uninstalling Lucid removes everything it stored on the phone.',
  },
  {
    title: 'Students',
    body: 'Lucid is made for high school students. It collects only what this page lists, whatever your age.',
  },
  {
    title: 'Changes and questions',
    body: 'If this policy changes, the new version comes with an app update. For questions, use the contact email on Lucid’s app store page.',
  },
];

export default function Privacy() {
  return (
    <Screen scroll padded={false}>
      <Header title="Privacy policy" />
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
        <Text variant="caption" tone="muted" className="font-sans">
          Last updated {UPDATED}
        </Text>
      </View>
    </Screen>
  );
}
