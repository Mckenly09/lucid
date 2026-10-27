import { getDb } from './client';

// Every table keyed by uid; messages follow their chat and notes their pack (ON DELETE CASCADE).
const TABLES = ['quiz_results', 'cards', 'chats', 'user_packs'] as const;

/** Sign out without "keep", delete account, remove offline profile. */
export function deleteUserData(uid: string) {
  const db = getDb();
  db.withTransactionSync(() => TABLES.forEach((t) => db.runSync(`DELETE FROM ${t} WHERE uid = ?`, uid)));
}

/** Linking Google to an offline profile keeps its chats, cards and scores (auth.md §5). */
export function moveUserData(fromUid: string, toUid: string) {
  const db = getDb();
  db.withTransactionSync(() =>
    TABLES.forEach((t) => db.runSync(`UPDATE ${t} SET uid = ? WHERE uid = ?`, toUid, fromUid)),
  );
}
