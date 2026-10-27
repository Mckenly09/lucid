import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listUserPacks, type UserPack } from '@/db/user-packs';
import { useAuth } from '@/features/auth/useAuth';

/** The student's own packs, newest first; re-read on focus and after an edit (`reload`). */
export function useUserPacks() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [packs, setPacks] = useState<UserPack[]>(() => (uid ? listUserPacks(uid) : []));
  const reload = useCallback(() => setPacks(uid ? listUserPacks(uid) : []), [uid]);
  useFocusEffect(reload);
  return { packs, reload };
}
