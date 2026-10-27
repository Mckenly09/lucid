import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { saveCard } from '@/db/cards';
import { useAuth } from '@/features/auth/useAuth';
import { useColor } from '@/hooks/use-color';
import { SUBJECTS, type SubjectId } from '@/llm/subjects/config';

export type CardDraft = { subject: SubjectId; front: string; back: string; chatId?: string; shortened?: boolean };

type Props = { draft: CardDraft | null; onClose: () => void; onSaved: () => void };

const DECKS = SUBJECTS.map((s) => ({ id: s.id, label: s.short }));
const INPUT = 'min-h-20 rounded-sm border border-ink/10 bg-ink/5 px-3 py-3 font-sans text-body text-ink';

/** Save an answer or quiz question as a flashcard; the student can edit both sides and pick the deck. */
export function SaveCardSheet({ draft, onClose, onSaved }: Props) {
  return (
    <Sheet visible={!!draft} onClose={onClose} title="Save as card">
      {/* Mounted per open, so the form starts from the new draft each time. */}
      {draft && <Form draft={draft} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function Form({ draft, onClose, onSaved }: { draft: CardDraft } & Omit<Props, 'draft'>) {
  const { user } = useAuth();
  const placeholderColor = useColor('default');
  const [front, setFront] = useState(draft.front);
  const [back, setBack] = useState(draft.back);
  const [subject, setSubject] = useState(draft.subject);
  const [failed, setFailed] = useState(false);
  const ready = front.trim() !== '' && back.trim() !== '';

  const save = () => {
    if (!user || !ready) return;
    try {
      saveCard(user.uid, { subject, front: front.trim(), back: back.trim(), chatId: draft.chatId });
      onSaved();
    } catch (e) {
      console.warn('Could not save card', e instanceof Error ? e.message : e);
      setFailed(true);
    }
  };

  return (
    <View className="gap-2 pt-2">
      <Text variant="label">Front · question</Text>
      <TextInput
        value={front}
        onChangeText={setFront}
        multiline
        maxLength={300}
        placeholder="Question"
        placeholderTextColor={placeholderColor}
        accessibilityLabel="Card front, the question"
        className={INPUT}
      />
      <Text variant="label" className="mt-2">
        Back · answer
      </Text>
      <TextInput
        value={back}
        onChangeText={setBack}
        multiline
        maxLength={600}
        placeholder="Answer"
        placeholderTextColor={placeholderColor}
        accessibilityLabel="Card back, the answer"
        className={INPUT}
      />
      {draft.shortened && (
        <Text variant="caption" tone="muted">
          Lucid shortened the answer. Edit it if you like.
        </Text>
      )}
      <Text variant="label" className="mt-2">
        Deck
      </Text>
      <SubjectPicker value={subject} onChange={setSubject} options={DECKS} />
      {failed && (
        <Text variant="small" tone="danger">
          Couldn&apos;t save the card. Please try again.
        </Text>
      )}
      <View className="mt-4 flex-row gap-3">
        <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={onClose} />
        <Button label="Save card" size="lg" className="flex-1" disabled={!ready} onPress={save} />
      </View>
    </View>
  );
}
