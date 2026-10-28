import { type BackupData, TABLES } from '@/features/backup/services/backup';

// Web is a design preview without SQLite (see chats.web.ts).
export const readBackupData = (_uid: string) => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as BackupData;
export function insertBackupData(_uid: string, _data: BackupData) {}
