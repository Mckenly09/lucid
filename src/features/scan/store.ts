import { create } from 'zustand';

export type ScanResult = { text: string; note?: string; preview: string };

/** Hands the read text from the camera to the result screen; in memory only, cleared when the result screen closes. */
export const useScan = create<{
  result: ScanResult | null;
  set: (result: ScanResult | null) => void;
}>((set) => ({
  result: null,
  set: (result) => set({ result }),
}));
