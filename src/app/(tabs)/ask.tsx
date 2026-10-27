import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Composer } from '@/components/composer';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { OfflineBadge } from '@/components/offline-badge';
import { Screen } from '@/components/screen';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { AccountButton } from '@/features/auth/components/AccountButton';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { SUGGESTIONS } from '@/features/demo-data';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';
import { detectSubject } from '@/llm/subjects/detect';

const OPTIONS: { id: SubjectId | 'auto'; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  ...SUBJECTS.filter((s) => s.id !== 'general').map((s) => ({
    id: s.id,
    label: s.short,
  })),
];

export default function Ask() {
  // From Home: `subject` preselects a chip, `focus` opens the keyboard. Each comes with a fresh value per tap
  // (`at` / `focus`), because this tab stays mounted and the same subject twice wouldn't change the params.
  const params = useLocalSearchParams<{ subject?: SubjectId; at?: string; focus?: string }>();
  const [picked, setPicked] = useState<SubjectId | 'auto'>('auto');
  const [lastAt, setLastAt] = useState<string>();
  const { user } = useAuth();
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  if (params.at !== lastAt) {
    setLastAt(params.at);
    // General has no chip; it means "let Lucid pick".
    if (params.subject) setPicked(params.subject === 'general' ? 'auto' : params.subject);
  }

  useEffect(() => {
    if (params.focus) input.current?.focus();
  }, [params.focus]);
  const ask = (q: string) => {
    if (!user) return; // the tabs only render signed in
    const { newChat, ask: send } = useChat.getState();
    const id = newChat(user.uid, picked === 'auto' ? detectSubject(q) : picked);
    void send(id, q);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <Screen scroll edges={['top']} footer={<Composer onSend={ask} inputRef={input} />}>
      <View className="h-11 flex-row items-center gap-2">
        <Logo size="sm" />
        <Text variant="h3">Lucid</Text>
        <View className="-mr-2 ml-auto flex-row items-center gap-1">
          <OfflineBadge />
          <AccountButton />
        </View>
      </View>

      <View className="mt-8 gap-1">
        <Text variant="h1" accessibilityRole="header">
          What are we studying today?
        </Text>
        <Text tone="muted">Pick a subject, or just ask.</Text>
      </View>

      <View className="mt-6">
        <SubjectPicker value={picked} onChange={setPicked} options={OPTIONS} />
      </View>

      <Text variant="label" className="mb-2 mt-6">
        Try asking
      </Text>
      <View className="gap-2">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.q}
            onPress={() => ask(s.q)}
            accessibilityLabel={`Ask: ${s.q}`}
            className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text variant="caption" tone="muted" className="font-sans">
                {subject(s.subject).short}
              </Text>
              <Text>{s.q}</Text>
            </View>
            <Icon name="ChevronRight" size={18} tone="muted" />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
