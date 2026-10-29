import { router } from 'expo-router';

import type { SubjectId } from '@/llm/subjects/config';

import { useChat } from './store';

/** Starts a new chat in `subjectId`, asks `question` and opens it (Home suggestions, Explain from the tools). */
export function askNow(uid: string, subjectId: SubjectId, question: string) {
  const { newChat, ask } = useChat.getState();
  const id = newChat(uid, subjectId);
  void ask(id, question);
  router.push({ pathname: '/chat/[id]', params: { id } });
}
