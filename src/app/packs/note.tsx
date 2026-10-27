import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { addNotes, deleteNote, getNote, updateNote } from '@/db/user-packs';
import { useAuth } from '@/features/auth/useAuth';
import { NOTE_MAX_CHARS } from '@/features/knowledge/services/split-notes';
import { useColor } from '@/hooks/use-color';

const INPUT = 'rounded-sm border border-ink/10 bg-ink/5 px-3 py-3 font-sans text-body text-ink';

/** Add a note to a student's pack (`noteId` absent) or edit/delete one. */
export default function NoteEditor() {
  const { packId, noteId } = useLocalSearchParams<{ packId: string; noteId?: string }>();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const placeholderColor = useColor('default');
  // Read once: the editor owns the text until Save.
  const [existing] = useState(() => (noteId && uid ? getNote(uid, packId, Number(noteId)) : null));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = title.trim() !== '' && text.trim() !== '';

  if (noteId && !existing) {
    return (
      <Screen>
        <Header />
        <EmptyState title="Note not found" message="It may have been deleted." />
      </Screen>
    );
  }

  const save = () => {
    const note = { title: title.trim(), text: text.trim() };
    try {
      if (existing) updateNote(uid, packId, existing.id, note);
      else addNotes(uid, packId, [note]);
      router.back();
    } catch (e) {
      console.warn('Could not save note', e instanceof Error ? e.message : e);
      setFailed(true);
    }
  };

  const remove = () => {
    if (existing) deleteNote(uid, packId, existing.id);
    setConfirmDelete(false);
    router.back();
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="flex-row gap-3 px-4 pb-8 pt-3">
          {existing && (
            <Button label="Delete" variant="secondary" size="lg" className="flex-1" onPress={() => setConfirmDelete(true)} />
          )}
          <Button label="Save" size="lg" className="flex-1" disabled={!ready} onPress={save} />
        </View>
      }>
      <Header title={existing ? 'Edit note' : 'New note'} />
      <View className="gap-2 px-4 pb-6 pt-2">
        <Text variant="label">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Photosynthesis"
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Note title"
          maxLength={120}
          autoFocus={!existing}
          className={`min-h-12 ${INPUT}`}
        />
        <Text variant="label" className="mt-2">
          Note
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type or paste your notes here."
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Note text"
          multiline
          textAlignVertical="top"
          maxLength={NOTE_MAX_CHARS}
          className={`min-h-48 ${INPUT}`}
        />
        <Text variant="caption" tone="muted">
          {text.length}/{NOTE_MAX_CHARS} · Short notes on one idea work best. Lucid shows “Your notes” under answers
          that used them.
        </Text>
        {failed && (
          <Text variant="small" tone="danger">
            Couldn&apos;t save the note. Please try again.
          </Text>
        )}
      </View>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this note?">
        <Text tone="muted">This can’t be undone.</Text>
        <View className="mt-6 flex-row gap-3">
          <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={() => setConfirmDelete(false)} />
          <Button label="Delete" variant="danger" size="lg" className="flex-1" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}
