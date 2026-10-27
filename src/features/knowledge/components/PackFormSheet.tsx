import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { useColor } from '@/hooks/use-color';
import { SUBJECTS, type SubjectId } from '@/llm/subjects/config';

export type PackForm = { name: string; subject: SubjectId };

type Props = {
  /** null = closed; `initial` with an empty name = new pack. */
  initial: PackForm | null;
  title: string;
  onSave: (pack: PackForm) => void;
  onClose: () => void;
};

const SUBJECT_OPTIONS = SUBJECTS.map((s) => ({ id: s.id, label: s.short }));

/** Name and subject of a student's own pack. Lucid searches it when answering questions in that subject. */
export function PackFormSheet({ initial, title, onSave, onClose }: Props) {
  return (
    <Sheet visible={!!initial} onClose={onClose} title={title}>
      {initial && <Form initial={initial} onSave={onSave} onClose={onClose} />}
    </Sheet>
  );
}

function Form({ initial, onSave, onClose }: { initial: PackForm } & Pick<Props, 'onSave' | 'onClose'>) {
  const placeholderColor = useColor('default');
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const ready = name.trim() !== '';
  return (
    <View className="gap-2 pt-2">
      <Text variant="label">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Biology reviewer"
        placeholderTextColor={placeholderColor}
        accessibilityLabel="Pack name"
        maxLength={60}
        autoFocus={!initial.name}
        returnKeyType="done"
        className="min-h-12 rounded-sm border border-ink/10 bg-ink/5 px-3 py-3 font-sans text-body text-ink"
      />
      <Text variant="label" className="mt-2">
        Subject
      </Text>
      <SubjectPicker value={subject} onChange={setSubject} options={SUBJECT_OPTIONS} />
      <Text variant="caption" tone="muted">
        Lucid reads this pack when you ask about this subject. General packs are read for every subject.
      </Text>
      <View className="mt-4 flex-row gap-3">
        <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={onClose} />
        <Button label="Save" size="lg" className="flex-1" disabled={!ready} onPress={() => onSave({ name: name.trim(), subject })} />
      </View>
    </View>
  );
}
