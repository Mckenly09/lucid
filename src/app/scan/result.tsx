import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { styled } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/features/auth/useAuth';
import { useChat } from '@/features/chat/store';
import { MathKeysRow } from '@/features/scan/components/math-keys-row';
import { insertKey, type MathKey } from '@/features/scan/math-keys';
import { useScan } from '@/features/scan/store';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';
import { detectSubject } from '@/llm/subjects/detect';

const StyledImage = styled(Image, { className: 'style' });
const OPTIONS = SUBJECTS.map((s) => ({ id: s.id, label: s.short }));

export default function ScanResult() {
  // Set when the scan started from a chat: the question goes there as a follow-up.
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const [result] = useState(() => useScan.getState().result);
  const [text, setText] = useState(result?.text ?? '');
  const [chosen, setChosen] = useState<SubjectId | null>(null);
  const [picking, setPicking] = useState(false);
  // Where the cursor is, so a math key lands there; `moveTo` places it after a key, then hands control back.
  // Starts at the end, so a key tapped before touching the box adds to the question instead of its start.
  const cursor = useRef({ start: text.length, end: text.length });
  const [moveTo, setMoveTo] = useState<{ start: number; end: number }>();
  const { user } = useAuth();
  // Re-detected as the student fixes the text, until they pick one.
  const picked = chosen ?? detectSubject(text);

  // The preview lives only in memory; drop it once this screen closes.
  useEffect(() => () => useScan.getState().set(null), []);

  const addKey = (key: MathKey) => {
    const next = insertKey(text, cursor.current, key);
    setText(next.text);
    cursor.current = { start: next.cursor, end: next.cursor };
    setMoveTo(cursor.current);
  };

  const ask = () => {
    const q = text.trim();
    if (!q || !user) return;
    const chat = useChat.getState();
    // Close the result and the camera, then show the answer.
    router.dismiss(2);
    if (chatId) return void chat.ask(chatId, q);
    const id = chat.newChat(user.uid, picked);
    void chat.ask(id, q);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="flex-row gap-3 px-4 pb-4 pt-3">
          <Button
            label="Retake"
            variant="outline"
            size="lg"
            icon={<Icon name="Camera" size={20} />}
            onPress={() => router.back()}
            className="flex-1"
          />
          <Button label="Ask Lucid" size="lg" onPress={ask} disabled={!text.trim()} className="flex-1" />
        </View>
      }>
      <Header title="Check the question" />
      <View className="gap-6 px-4 pt-2">
        {result && (
          <View className="gap-2">
            <StyledImage
              source={{ uri: result.preview }}
              contentFit="contain"
              accessibilityLabel="The photo you took"
              className="h-40 w-full rounded-md bg-ink/5"
            />
            <Text variant="caption" tone="muted">
              Your photo stays on your phone.
            </Text>
          </View>
        )}

        <View className="gap-2">
          <TextField
            label="Lucid read this — fix any mistakes"
            value={text}
            onChangeText={setText}
            selection={moveTo}
            onSelectionChange={(e) => {
              cursor.current = e.nativeEvent.selection;
              setMoveTo(undefined);
            }}
            multiline
            textAlignVertical="top"
            autoCorrect={false}
          />
          {result?.note && (
            <View className="flex-row items-center gap-2">
              <Icon name="Info" size={16} tone="muted" />
              <Text variant="small" tone="muted" className="flex-1">
                {result.note}
              </Text>
            </View>
          )}
        </View>

        {picked === 'math' && <MathKeysRow onKey={addKey} />}

        {picked === 'math' && (
          <Banner
            status="warning"
            message="Check numbers and symbols carefully."
            icon={<Icon name="TriangleAlert" size={18} tone="warning" />}
          />
        )}

        {/* A follow-up stays in its chat's subject. */}
        {!chatId && (
          <Card className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text variant="caption" tone="muted">
                {chosen ? 'Subject' : 'Subject (detected)'}
              </Text>
              <Text className="font-semibold">{subject(picked).name}</Text>
            </View>
            <Button label="Change" variant="outline" size="sm" onPress={() => setPicking(true)} />
          </Card>
        )}
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Subject">
        <View className="pt-3">
          <SubjectPicker
            value={picked}
            options={OPTIONS}
            onChange={(id) => {
              setChosen(id);
              setPicking(false);
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
