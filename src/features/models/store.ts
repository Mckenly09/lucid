import { type DownloadPauseState, DownloadTask, File } from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ModelStatus } from '@/components/model-card';
import { storage } from '@/utils/kv-storage';
import { type Model, type ModelId, modelById } from '@/llm/models';

import { modelFile, modelsDir, partFile, toPath, verify } from './services/files';

type Models = {
  /** Verified model on disk. */
  installedId: ModelId | null;
  /** The model being downloaded, or picked but not started. */
  activeId: ModelId | null;
  /** Resume data for a paused download, kept across restarts. */
  paused: DownloadPauseState | null;
  status: ModelStatus;
  progress: number;
  start: (model: Model) => void;
  pause: () => void;
  resume: () => void;
};

// One download at a time; native task handles can't live in persisted state.
let task: DownloadTask | null = null;

export const useModels = create<Models>()(
  persist(
    (set, get) => {
      const onProgress = ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
        const id = get().activeId;
        const total = totalBytes > 0 ? totalBytes : id ? modelById(id).sizeBytes : 0;
        const progress = total ? Math.min(bytesWritten / total, 1) : 0;
        // Whole-percent steps so a 1 GB download doesn't re-render thousands of times.
        if (Math.floor(progress * 100) !== Math.floor(get().progress * 100)) set({ progress });
      };

      const run = async (model: Model, op: Promise<File | null>) => {
        set({ status: 'downloading', paused: null });
        try {
          const file = await op;
          if (!file) {
            set({ status: 'paused', paused: task?.savable() ?? null });
            return;
          }
          task = null;
          const part = partFile(model);
          if (!(await verify(part, model))) {
            part.delete();
            set({ status: 'failed', progress: 0 });
            return;
          }
          const final = modelFile(model);
          if (final.exists) final.delete();
          part.move(final);
          // Switching in Settings: the new model replaces the old one, so a small phone never holds two.
          // No unload: an answer mid-stream keeps its mapped file; the next question loads the new path.
          const prev = get().installedId;
          if (prev && prev !== model.id) {
            const old = modelFile(modelById(prev));
            if (old.exists) old.delete();
          }
          set({ status: 'ready', installedId: model.id, progress: 1 });
        } catch {
          // shortcut: a dropped connection (or the app being killed mid-download) leaves no resume data, so Retry
          // starts over; only Pause survives. Save task.savable() on AppState 'background' if testers hit this.
          task = null;
          set({ status: 'failed' });
        }
      };

      return {
        installedId: null,
        activeId: null,
        paused: null,
        status: 'available',
        progress: 0,

        start: (model) => {
          task?.cancel();
          // Switching models after a pause: drop the old partial download so it doesn't hold storage.
          const prev = get().activeId;
          if (prev && prev !== model.id) {
            const old = partFile(modelById(prev));
            if (old.exists) old.delete();
          }
          modelsDir().create({ intermediates: true, idempotent: true });
          const part = partFile(model);
          if (part.exists) part.delete();
          set({ activeId: model.id, progress: 0 });
          task = File.createDownloadTask(model.url, part, { onProgress });
          void run(model, task.downloadAsync());
        },

        pause: () => task?.pause(),

        resume: () => {
          const { activeId, paused } = get();
          if (!activeId) return;
          const model = modelById(activeId);
          if (task?.state === 'paused') return void run(model, task.resumeAsync());
          if (!paused) return get().start(model);
          task = DownloadTask.fromSavable(paused, { onProgress });
          void run(model, task.resumeAsync());
        },
      };
    },
    {
      name: 'models',
      storage: createJSONStorage(() => storage),
      partialize: ({ installedId, activeId, paused, progress }) => ({ installedId, activeId, paused, progress }),
      // Status isn't persisted: derive it so a restart shows ready or paused, never a dead "downloading".
      merge: (saved, current) => {
        const s = { ...current, ...(saved as Partial<Models>) };
        const installed = s.installedId !== null && modelFile(modelById(s.installedId)).exists;
        return {
          ...s,
          installedId: installed ? s.installedId : null,
          status: installed ? 'ready' : s.paused ? 'paused' : s.activeId ? 'failed' : 'available',
        };
      },
    },
  ),
);

/** Path of the verified model to pass to the engine, or null when none is installed. */
export function installedModelPath() {
  const id = useModels.getState().installedId;
  return id ? toPath(modelFile(modelById(id)).uri) : null;
}
