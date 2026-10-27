import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Card } from '@/components/card';
import { Composer } from '@/components/composer';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { OfflineBadge } from '@/components/offline-badge';
import { Screen } from '@/components/screen';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { AccountButton } from '@/features/auth/components/AccountButton';
import { SUGGESTIONS } from '@/features/demo-data';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';

const OPTIONS: { id: SubjectId | 'auto'; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  ...SUBJECTS.filter((s) => s.id !== 'general').map((s) => ({ id: s.id, label: s.short })),
];

export default function Ask() {
  const [picked, setPicked] = useState<SubjectId | 'auto'>('auto');
  // shortcut: every question opens the demo chat; replace with creating a chat in features/chat.
  const ask = (q: string) => router.push({ pathname: '/chat/[id]', params: { id: 'new', q } });

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll edges={['top']} footer={<Composer onSend={ask} />}>
        <View className="flex-row items-center gap-2 py-3">
          <Logo size="sm" />
          <Text variant="h2" className="font-bold">Lucid</Text>
          <View className="ml-auto flex-row items-center gap-3">
            <OfflineBadge />
            <AccountButton />
          </View>
        </View>

        <View className="mt-6 gap-1">
          <Text variant="display" accessibilityRole="header">What are we studying today?</Text>
          <Text variant="h3" tone="muted" className="font-sans">Pick a subject, or just ask.</Text>
        </View>

        <View className="mt-6">
          <SubjectPicker value={picked} onChange={setPicked} options={OPTIONS} />
        </View>

        <Text variant="label" className="mb-3 mt-8">Try asking</Text>
        <View className="gap-3">
          {SUGGESTIONS.map((s) => (
            <Card key={s.q} onPress={() => ask(s.q)} accessibilityLabel={`Ask: ${s.q}`} className="flex-row items-center">
              <View className="flex-1 gap-1">
                <Text variant="small" tone="muted">{subject(s.subject).short}</Text>
                <Text className="text-h3">{s.q}</Text>
              </View>
              <Icon ios="chevron.right" android="chevron_right" className="text-ink/60" />
            </Card>
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
