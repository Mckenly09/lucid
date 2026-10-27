import { create } from 'zustand';

// shortcut: in-memory, so onboarding shows on every launch. Replace with useAuth() + "model file exists" once those land.
export const useOnboarding = create<{ done: boolean; finish: () => void }>((set) => ({
  done: false,
  finish: () => set({ done: true }),
}));
