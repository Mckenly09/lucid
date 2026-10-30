import { create } from 'zustand';

import type { QuizQuestion } from '@/features/quiz/services/parse';

import type { PracticeTopic } from './topics';

export type PracticeResult = { questions: QuizQuestion[]; picked: number[] };

/** Hands the chosen topic to the session, and the session's answers to the results screen. In memory only. */
export const usePractice = create<{
  topic: PracticeTopic | null;
  result: PracticeResult | null;
  start: (topic: PracticeTopic) => void;
  finish: (result: PracticeResult) => void;
}>((set) => ({
  topic: null,
  result: null,
  start: (topic) => set({ topic, result: null }),
  finish: (result) => set({ result }),
}));
