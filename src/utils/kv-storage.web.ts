import type { StateStorage } from 'zustand/middleware';

// Web is a design preview driven by ?as= (AuthProvider.web.tsx), so nothing is kept between loads.
const memory = new Map<string, string>();

export const storage: StateStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};
