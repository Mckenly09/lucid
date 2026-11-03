import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
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
import { useSettings } from '@/features/settings/store';
import { SUGGESTIONS } from '@/features/demo-data';
import { VoiceSheet } from '@/features/voice/components/voice-sheet';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';
import { coursesFor } from '@/llm/subjects/courses';
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
  // Follows Settings → Default subject until the student taps a chip.
  const defaultSubject = useSettings((s) => s.defaultSubject);
  const [chosen, setChosen] = useState<SubjectId | 'auto' | null>(null);
  const picked = chosen ?? defaultSubject;
  const electives = useSettings((s) => s.electives);
  // '' is "Any course"; cleared with every subject change because courses belong to one subject.
  const [courseId, setCourseId] = useState('');
  const pick = (id: SubjectId | 'auto') => {
    setChosen(id);
    setCourseId('');
  };
  const courseOptions =
    picked === 'auto' ? [] : [{ id: '', label: 'Any course' }, ...coursesFor(picked, electives).map((c) => ({ id: c.id, label: c.name }))];
  // The tab stays mounted: an elective unpicked in Settings, or a new default subject, must not linger here.
  const course = courseOptions.some((o) => o.id === courseId) ? courseId : '';
  const [lastAt, setLastAt] = useState<string>();
  const { user } = useAuth();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [listening, setListening] = useState(false);

  if (params.at !== lastAt) {
    setLastAt(params.at);
    // General has no chip; it means "let Lucid pick".
    if (params.subject) pick(params.subject === 'general' ? 'auto' : params.subject);
  }

  useEffect(() => {
    if (params.focus) input.current?.focus();
  }, [params.focus]);
  // Load the model while the student types, so the answer doesn't start with a wait (after the UI shows: AGENTS.md cold start).
  useFocusEffect(useCallback(() => useChat.getState().warmUp(), []));
  const ask = (q: string) => {
    if (!user) return; // the tabs only render signed in
    const { newChat, ask: send } = useChat.getState();
    const id = picked === 'auto' ? newChat(user.uid, detectSubject(q)) : newChat(user.uid, picked, course || null);
    void send(id, q);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <Screen scroll edges={['top']} footer={
        <Composer onSend={ask} inputRef={input} onCamera={() => router.push('/scan')} onMic={() => setListening(true)} />
      }>
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
        <Text tone="muted">Type, scan a question, or just say it.</Text>
      </View>

      <View className="mt-6">
        <SubjectPicker value={picked} onChange={pick} options={OPTIONS} />
      </View>

      {courseOptions.length > 1 && (
        <View className="mt-4 gap-2">
          <Text variant="label">Course</Text>
          <SubjectPicker value={course} onChange={setCourseId} options={courseOptions} />
        </View>
      )}

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
      <VoiceSheet visible={listening} onClose={() => setListening(false)} onText={ask} />
    </Screen>
  );
}
