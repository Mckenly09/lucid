import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/utils/kv-storage';

type Onboarding = {
  /** Signed in at least once on this phone: skip Welcome after sign-out. */
  welcomed: boolean;
  /** Model setup finished: skip it after sign-out or restart. */
  done: boolean;
  markWelcomed: () => void;
  finish: () => void;
};

// shortcut: `done` is a flag, not "model file exists"; replace it with the models feature's check once downloads land.
export const useOnboarding = create<Onboarding>()(
  persist(
    (set) => ({
      welcomed: false,
      done: false,
      markWelcomed: () => set({ welcomed: true }),
      finish: () => set({ done: true }),
    }),
    { name: 'onboarding', storage: createJSONStorage(() => storage) },
  ),
);
