import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { type Deck, listDecks } from '@/db/cards';
import { useAuth } from '@/features/auth/useAuth';

import { endOfDay } from './services/schedule';

/** The student's decks and today's due total; re-reads whenever the screen comes into focus. */
export function useDecks() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [decks, setDecks] = useState<Deck[]>([]);

  useFocusEffect(
    useCallback(() => {
      setDecks(uid ? listDecks(uid, endOfDay(Date.now())) : []);
    }, [uid]),
  );
  return { decks, due: decks.reduce((n, d) => n + d.due, 0), total: decks.reduce((n, d) => n + d.total, 0) };
}

/** ~30 s per card. */
export const reviewMinutes = (cards: number) => Math.max(1, Math.ceil(cards / 2));
