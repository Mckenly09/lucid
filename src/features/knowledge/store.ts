import { type DownloadPauseState, DownloadTask, File } from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/utils/kv-storage';

import { closePack, packFile, packPartFile, packsDir } from './pack-files';
import { CATALOG_URL, type CatalogPack, parseCatalog } from './services/catalog';

export type PackDownloadStatus = 'downloading' | 'paused' | 'failed';

type Packs = {
  /** Last catalog fetched; kept so Library works offline. */
  catalog: CatalogPack[] | null;
  catalogStatus: 'idle' | 'loading' | 'error';
  /** Verified packs on this phone, by id. */
  installed: Record<string, CatalogPack>;
  /** The pack being downloaded (one at a time, like the model). */
  active: CatalogPack | null;
  status: PackDownloadStatus | null;
  progress: number;
  /** Resume data for a paused download, kept across restarts. */
  paused: DownloadPauseState | null;
  refreshCatalog: () => Promise<void>;
  download: (pack: CatalogPack) => void;
  pause: () => void;
  resume: () => void;
  remove: (id: string) => void;
};

const CATALOG_TIMEOUT_MS = 15_000;

// Native task handles can't live in persisted state.
let task: DownloadTask | null = null;

export const usePacks = create<Packs>()(
  persist(
    (set, get) => {
      const onProgress = ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
        const total = totalBytes > 0 ? totalBytes : (get().active?.sizeMB ?? 0) * 1024 ** 2;
        const progress = total ? Math.min(bytesWritten / total, 1) : 0;
        if (Math.floor(progress * 100) !== Math.floor(get().progress * 100)) set({ progress });
      };

      const run = async (pack: CatalogPack, op: Promise<File | null>) => {
        set({ status: 'downloading', paused: null });
        try {
          const file = await op;
          if (!file) {
            set({ status: 'paused', paused: task?.savable() ?? null });
            return;
          }
          task = null;
          const part = packPartFile(pack);
          if ((await part.digest('SHA-256')).toLowerCase() !== pack.sha256) {
            part.delete();
            set({ status: 'failed', progress: 0 });
            return;
          }
          // An update replaces the old version's file.
          const old = get().installed[pack.id];
          if (old) {
            closePack(old);
            const oldFile = packFile(old);
            if (oldFile.exists) oldFile.delete();
          }
          const final = packFile(pack);
          if (final.exists) final.delete();
          part.move(final);
          set((s) => ({ installed: { ...s.installed, [pack.id]: pack }, active: null, status: null, progress: 0 }));
        } catch {
          // shortcut: like the model download, only Pause keeps resume data; a dropped connection retries from zero.
          task = null;
          set({ status: 'failed' });
        }
      };

      return {
        catalog: null,
        catalogStatus: 'idle',
        installed: {},
        active: null,
        status: null,
        progress: 0,
        paused: null,

        refreshCatalog: async () => {
          set({ catalogStatus: 'loading' });
          const abort = new AbortController();
          const timer = setTimeout(() => abort.abort(), CATALOG_TIMEOUT_MS);
          try {
            const res = await fetch(CATALOG_URL, { signal: abort.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            set({ catalog: parseCatalog(await res.json()), catalogStatus: 'idle' });
          } catch {
            // Offline or not published yet: keep showing the last catalog we had.
            set({ catalogStatus: 'error' });
          } finally {
            clearTimeout(timer);
          }
        },

        download: (pack) => {
          task?.cancel();
          const prev = get().active;
          if (prev && (prev.id !== pack.id || prev.version !== pack.version)) {
            const old = packPartFile(prev);
            if (old.exists) old.delete();
          }
          packsDir().create({ intermediates: true, idempotent: true });
          const part = packPartFile(pack);
          if (part.exists) part.delete();
          set({ active: pack, progress: 0 });
          task = File.createDownloadTask(pack.url, part, { onProgress });
          void run(pack, task.downloadAsync());
        },

        pause: () => task?.pause(),

        resume: () => {
          const { active, paused } = get();
          if (!active) return;
          if (task?.state === 'paused') return void run(active, task.resumeAsync());
          if (!paused) return get().download(active);
          task = DownloadTask.fromSavable(paused, { onProgress });
          void run(active, task.resumeAsync());
        },

        remove: (id) => {
          const pack = get().installed[id];
          if (!pack) return;
          closePack(pack);
          const file = packFile(pack);
          if (file.exists) file.delete();
          set((s) => {
            const { [id]: _gone, ...installed } = s.installed;
            return { installed };
          });
        },
      };
    },
    {
      name: 'packs',
      storage: createJSONStorage(() => storage),
      partialize: ({ catalog, installed, active, paused, progress }) => ({ catalog, installed, active, paused, progress }),
      // Status isn't persisted: a restart shows paused or failed, never a dead "downloading". Missing files drop out.
      merge: (saved, current) => {
        const s = { ...current, ...(saved as Partial<Packs>) };
        const installed = Object.fromEntries(Object.entries(s.installed).filter(([, p]) => packFile(p).exists));
        return { ...s, installed, status: s.paused ? 'paused' : s.active ? 'failed' : null };
      },
    },
  ),
);
