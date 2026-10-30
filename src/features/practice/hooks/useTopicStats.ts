import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { topicStats, type TopicStats } from '@/db/practice';
import { useAuth } from '@/features/auth/useAuth';
import type { SubjectId } from '@/llm/subjects/config';

/** Last score and mastery per topic for one subject and grade; re-read on focus (like useDecks) so a new session shows. */
export function useTopicStats(subject: SubjectId | undefined, grade: number | undefined) {
  const uid = useAuth().user?.uid;
  const read = useCallback((): Record<string, TopicStats> => {
    if (!uid || !subject || grade === undefined) return {};
    try {
      return topicStats(uid, subject, grade);
    } catch (e) {
      console.warn('Could not read practice scores', e instanceof Error ? e.message : e);
      return {};
    }
  }, [uid, subject, grade]);
  const [stats, setStats] = useState(read);
  // Re-runs when the subject or grade changes too, since `read` changes with them.
  useFocusEffect(useCallback(() => setStats(read()), [read]));
  return stats;
}
