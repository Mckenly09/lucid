import type { SubjectId } from '@/llm/subjects/config';

import type { ChatSummary, Role, StoredChat } from './chats';

export type { ChatSummary, Role, StoredChat } from './chats';

// Web is a design preview (AuthProvider.web.tsx) without SQLite, so nothing is saved there.
export function saveMessage(_uid: string, _chat: { id: string }, _role: Role, _content: string, _sources?: string[]) {}
export const listChats = (_uid: string, _search = '', _limit = 200): ChatSummary[] => [];
export const findAnsweredChat = (_uid: string, _question: string): string | null => null;
export const getChat = (_uid: string, _id: string): StoredChat | null => null;
export function setChatSubject(_uid: string, _id: string, _subject: SubjectId) {}
export function deleteChat(_uid: string, _id: string) {}
