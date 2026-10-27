import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/utils/kv-storage';

import type { AuthUser } from './types';

type LocalProfile = {
  profile: AuthUser | null;
  create: (name: string) => void;
  clear: () => void;
};

/** "Continue without an account": a profile that lives only on this phone, so Lucid works with no internet ever. */
export const useLocalProfile = create<LocalProfile>()(
  persist(
    (set) => ({
      profile: null,
      create: (name) =>
        set({
          profile: {
            // Not a secret, just a key for this phone's data (AGENTS.md: key local data by uid).
            uid: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
            name: name.trim() || null,
            email: null,
            photoUrl: null,
            isLocal: true,
          },
        }),
      clear: () => set({ profile: null }),
    }),
    { name: 'local-profile', storage: createJSONStorage(() => storage) },
  ),
);
