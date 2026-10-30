import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AnswerLanguage } from '@/llm/prompts';
import type { SubjectId } from '@/llm/subjects/config';
import { storage } from '@/utils/kv-storage';

export type { AnswerLanguage };
export type Appearance = 'system' | 'light' | 'dark';
/** Auto-detect, or force English / Filipino (Whisper `tl`). */
export type VoiceLanguage = 'auto' | 'en' | 'tl';

type Settings = {
  /** The Ask screen's preselected chip. */
  defaultSubject: SubjectId | 'auto';
  answerLanguage: AnswerLanguage;
  /** Daily card reminder at 7:00 PM (opt-in, on-device only). */
  reminder: boolean;
  appearance: Appearance;
  /** The last language picked on the voice listening sheet. */
  voiceLanguage: VoiceLanguage;
  /** Course ids of the senior high electives the student takes (src/llm/subjects/courses.ts). */
  electives: string[];
  set: (patch: Partial<Omit<Settings, 'set' | 'reset'>>) => void;
  reset: () => void;
};

const DEFAULTS = { defaultSubject: 'auto', answerLanguage: 'same', reminder: false, appearance: 'system', voiceLanguage: 'auto', electives: [] as string[] } as const;

// shortcut: one set of settings per phone, not per uid; fine while one student uses a phone at a time.
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'settings', storage: createJSONStorage(() => storage) },
  ),
);
