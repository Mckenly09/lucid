import type { TopicStats } from './practice';

export type { TopicStats } from './practice';

// Web is a design preview without SQLite (see chats.web.ts), so practice isn't saved or cached there.
export function savePracticeSession(_uid: string, _session: object) {}
export const topicStats = (_uid: string, _subject: string, _grade: number): Record<string, TopicStats> => ({});
export const cachedQuestions = (_topic: string, _packKey: string) => [];
export function cacheQuestions(_topic: string, _packKey: string, _questions: object[]) {}
