import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { ListItem } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import {
  addNotes,
  deleteUserPack,
  getUserPack,
  listNotes,
  updateUserPack,
  type UserNote,
  type UserPack,
} from '@/db/user-packs';
import { useAuth } from '@/features/auth/useAuth';
import { type PackForm, PackFormSheet } from '@/features/knowledge/components/PackFormSheet';
import { splitNotes } from '@/features/knowledge/services/split-notes';
import { subject } from '@/llm/subjects/config';

const MAX_IMPORT_BYTES = 1024 ** 2;
const TEXT_FILE = /\.(txt|md|markdown)$/i;

/** A student's own pack: its notes, plus add, import, edit and delete. */
export default function PackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [pack, setPack] = useState<UserPack | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<PackForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ status: 'success' | 'danger'; message: string } | null>(null);
  const [importing, setImporting] = useState(false);

  // Re-read when coming back from the note editor.
  const reload = useCallback(() => {
    setPack(uid ? getUserPack(uid, id) : null);
    setNotes(uid ? listNotes(uid, id) : []);
    setLoaded(true);
  }, [uid, id]);
  useFocusEffect(reload);

  if (loaded && !pack) {
    return (
      <Screen>
        <Header />
        <EmptyState title="Pack not found" message="It may have been deleted." />
      </Screen>
    );
  }

  const save = (form: PackForm) => {
    setEditing(null);
    updateUserPack(uid, id, form);
    reload();
  };

  const remove = () => {
    deleteUserPack(uid, id);
    setConfirmDelete(false);
    router.back();
  };

  const importFile = async () => {
    setNotice(null);
    // Any type: Android often labels .md files application/octet-stream, so the extension is checked instead.
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    if (!TEXT_FILE.test(asset.name)) {
      setNotice({ status: 'danger', message: 'Pick a .txt or .md file.' });
      return;
    }
    // The picker's `size` is optional; the cached copy's real size isn't, so a huge file is never read into memory.
    const file = new File(asset.uri);
    if (!file.exists || file.size > MAX_IMPORT_BYTES) {
      setNotice({
        status: 'danger',
        message: file.exists ? 'That file is too big. The limit is 1 MB.' : "Couldn't read that file. Please try again.",
      });
      return;
    }
    setImporting(true);
    try {
      const content = await file.text();
      const found = content.includes(String.fromCharCode(0)) ? [] : splitNotes(content, asset.name);
      if (found.length === 0) {
        setNotice({ status: 'danger', message: 'That file has no text Lucid can read.' });
        return;
      }
      addNotes(uid, id, found);
      reload();
      setNotice({ status: 'success', message: found.length === 1 ? 'Imported 1 note.' : `Imported ${found.length} notes.` });
    } catch (e) {
      console.warn('Import failed', e instanceof Error ? e.message : e);
      setNotice({ status: 'danger', message: "Couldn't import that file. Please try again." });
    } finally {
      setImporting(false);
    }
  };

  const openNote = (noteId?: number) =>
    router.push({ pathname: '/packs/note', params: noteId ? { packId: id, noteId: String(noteId) } : { packId: id } });

  return (
    <Screen padded={false}>
      <Header
        title={pack?.name ?? ''}
        right={
          pack && (
            <Button
              label="Edit"
              variant="ghost"
              size="sm"
              onPress={() => setEditing({ name: pack.name, subject: pack.subject })}
            />
          )
        }
      />
      <FlatList
        data={notes}
        keyExtractor={(n) => String(n.id)}
        contentContainerClassName="px-4 pb-8"
        ListHeaderComponent={
          <View className="gap-4 pb-2 pt-2">
            {pack && (
              <Text variant="small" tone="muted">
                {subject(pack.subject).short} · {notes.length === 1 ? '1 note' : `${notes.length} notes`} · only on this phone
              </Text>
            )}
            <View className="flex-row gap-2">
              <Button label="Add note" className="flex-1" onPress={() => openNote()} />
              <Button
                label="Import file"
                variant="secondary"
                className="flex-1"
                loading={importing}
                onPress={() => void importFile()}
              />
            </View>
            {notice && (
              <Banner
                status={notice.status}
                message={notice.message}
                icon={
                  <Icon
                    name={notice.status === 'success' ? 'CircleCheck' : 'CircleAlert'}
                    size={22}
                    tone={notice.status}
                  />
                }
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Icon name="BookOpen" size={36} tone="muted" />}
            title="No notes yet"
            message="Type or paste your notes, or import a .txt or .md file. Headings (# Title) in a file become separate notes."
          />
        }
        renderItem={({ item }) => (
          <ListItem
            title={item.title}
            subtitle={item.text.replace(/\s+/g, ' ')}
            onPress={() => openNote(item.id)}
            right={<Icon name="ChevronRight" size={18} tone="muted" />}
          />
        )}
        ListFooterComponent={
          <Button label="Delete pack" variant="ghost" onPress={() => setConfirmDelete(true)} className="mt-6 self-center" />
        }
      />

      <PackFormSheet initial={editing} title="Edit pack" onSave={save} onClose={() => setEditing(null)} />
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this pack?">
        <Text tone="muted">
          “{pack?.name}” and its {notes.length === 1 ? 'note' : `${notes.length} notes`} will be removed from this
          phone. This can’t be undone.
        </Text>
        <View className="mt-6 flex-row gap-3">
          <Button label="Cancel" variant="secondary" size="lg" className="flex-1" onPress={() => setConfirmDelete(false)} />
          <Button label="Delete" variant="danger" size="lg" className="flex-1" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}
