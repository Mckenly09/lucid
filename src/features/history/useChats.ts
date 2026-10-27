import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { type ChatSummary, listChats } from '@/db/chats';
import { useAuth } from '@/features/auth/useAuth';

/** Saved chats for the signed-in student, newest first; re-reads whenever the screen comes into focus. */
export function useChats(search = '', limit?: number) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      setChats(uid ? listChats(uid, search.trim(), limit) : []);
    }, [uid, search, limit]),
  );
  return chats;
}
