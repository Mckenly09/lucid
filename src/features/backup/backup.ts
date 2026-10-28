import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { insertBackupData, readBackupData } from '@/db/backup';

import { type BackupData, makeBackup, parseBackup, rekey } from './services/backup';

/** Bigger than years of chats; stops a wrong file from being read into memory. */
const MAX_BACKUP_BYTES = 50 * 1024 ** 2;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Writes this account's data to a .json file and opens the share sheet (save to Files, Drive, send…). */
export async function exportBackup(uid: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  const day = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `lucid-backup-${day}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(makeBackup(readBackupData(uid))));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Lucid backup', UTI: 'public.json' });
}

export type PickedBackup = { data: BackupData } | { error: 'too-big' | 'invalid' } | null;

/** Lets the student pick a backup file and checks it; null when they cancel. Nothing is saved yet. */
export async function pickBackup(): Promise<PickedBackup> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  const file = new File(asset.uri);
  if (!file.exists) return { error: 'invalid' };
  if (file.size > MAX_BACKUP_BYTES) return { error: 'too-big' };
  const data = parseBackup(await file.text());
  return data ? { data } : { error: 'invalid' };
}

/** Adds a checked backup to the signed-in account, with new ids so nothing already there is overwritten. */
export function importBackup(uid: string, data: BackupData) {
  insertBackupData(uid, rekey(data, newId));
}
