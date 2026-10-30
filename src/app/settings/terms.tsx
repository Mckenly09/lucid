import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';

// The terms live only in the app, so they work offline. Opens from Settings, sign-up and the paywall.
const UPDATED = '30 October 2026';

const SECTIONS = [
  {
    title: 'Agreeing to these terms',
    body: 'By using Lucid you agree to these terms and to the Privacy Policy. If you don’t agree, please don’t use Lucid.',
  },
  {
    title: 'Who can use Lucid',
    body: 'Lucid is made for high school students. If you are under 18, or under the age of adulthood where you live, use Lucid only with your parent’s or guardian’s permission. They agree to these terms for you.',
  },
  {
    title: 'AI can be wrong',
    body: 'Lucid’s answers come from a small AI that runs on your phone. They can be wrong, incomplete or out of date. Always check important answers with your textbook or teacher. Lucid is a study aid, not professional, medical, legal or financial advice.',
  },
  {
    title: 'Use it to learn',
    body: 'Use Lucid to understand your lessons. Don’t use it to cheat on exams or graded work, or in any way your school doesn’t allow. You are responsible for how you use its answers.',
  },
  {
    title: 'What you must not do',
    body: 'Don’t use Lucid to break the law, harm others or make harmful content. Don’t copy, resell, reverse-engineer or tamper with the app, except where the law allows it.',
  },
  {
    title: 'Your account',
    body: 'Keep your password safe. You are responsible for what happens on your account. You can delete it at any time in Settings → Delete account and data.',
  },
  {
    title: 'Lucid Plus',
    body: 'Lucid Plus is a monthly subscription billed by Google Play, at the price Google Play shows before you buy. It renews automatically until you cancel it in Google Play › Subscriptions, at least 24 hours before the renewal date. Cancelling stops the next payment; you keep Plus until the period ends. Refunds follow Google Play’s refund rules. If Plus ends, you go back to the free limits; nothing you made is deleted, and a model you already downloaded keeps working. We may change the price; Google Play will tell you first.',
  },
  {
    title: 'Content and licences',
    body: 'Lucid, its design and its code belong to us. Subject packs come from open-licensed sources, and each pack shows its source and licence. The AI models are made by others and come under their own licences. Your questions and notes are yours.',
  },
  {
    title: 'No warranty',
    body: 'Lucid is provided “as is”. We work to keep it accurate and running, but we can’t promise it will be error-free, always available, or work on every phone.',
  },
  {
    title: 'Limit of liability',
    body: 'To the extent the law allows, we are not liable for indirect or consequential losses, such as lost grades or data, from using Lucid. Our total liability is limited to what you paid for Lucid Plus in the 12 months before the claim. Nothing here limits rights you have by law as a consumer.',
  },
  {
    title: 'Ending your use',
    body: 'You can stop using Lucid at any time by deleting your account and uninstalling the app. We may suspend accounts that break these terms.',
  },
  {
    title: 'Changes',
    body: 'If these terms change, the new version comes with an app update. Continuing to use Lucid after that means you accept them.',
  },
  {
    title: 'Governing law and contact',
    body: 'These terms are governed by the laws of the Republic of the Philippines. For questions, email Harry Mackenly Romion at lucidstudybuddy@gmail.com.',
  },
];

export default function Terms() {
  return (
    <Screen scroll padded={false}>
      <Header title="Terms and conditions" />
      <View className="gap-6 px-4 pb-8 pt-2">
        <Banner
          status="warning"
          title="AI can be wrong — check your textbook."
          message="Lucid is a study aid. Use it to learn, not to cheat."
          icon={<Icon name="TriangleAlert" size={22} tone="warning" />}
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
