import { type DownloadPauseState, DownloadTask, File } from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ModelStatus } from '@/components/model-card';
import { storage } from '@/utils/kv-storage';
import { type Model, type ModelId, modelById } from '@/llm/models';

import { type Download, filesOf, modelFile, modelsDir, partFile, toPath, verify } from './services/files';

export type Downloads<Id extends string, M extends Download<Id>> = {
  /** Verified model on disk. */
  installedId: Id | null;
  /** The model being downloaded, or picked but not started. */
  activeId: Id | null;
  /** Which of its files is downloading (a voice pack has several; an AI model one). */
  fileIndex: number;
  /** Resume data for a paused download, kept across restarts. */
  paused: DownloadPauseState | null;
  status: ModelStatus;
  progress: number;
  start: (model: M) => void;
  pause: () => void;
  resume: () => void;
};

const removeFiles = (d: Download) =>
  filesOf(d).forEach((f) => {
    for (const file of [modelFile(f), partFile(f)]) if (file.exists) file.delete();
  });

/**
 * A resumable, checksum-verified download from a catalog; installing one replaces the last. An entry with several
 * files downloads them one after another, each resumable and verified, and is installed only when all of them are.
 */
export function createDownloadStore<Id extends string, M extends Download<Id>>(name: string, byId: (id: Id) => M) {
  type Models = Downloads<Id, M>;
  // One download at a time per store; native task handles can't live in persisted state.
  let task: DownloadTask | null = null;

  return create<Models>()(
    persist(
      (set, get) => {
        const onProgress = ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
          const { activeId, fileIndex } = get();
          if (!activeId) return;
          const model = byId(activeId);
          const files = filesOf(model);
          const before = files.slice(0, fileIndex).reduce((n, f) => n + f.sizeBytes, 0);
          const current = totalBytes > 0 ? Math.min(bytesWritten, totalBytes) : bytesWritten;
          const progress = model.sizeBytes ? Math.min((before + current) / model.sizeBytes, 1) : 0;
          // Whole-percent steps so a 1 GB download doesn't re-render thousands of times.
          if (Math.floor(progress * 100) !== Math.floor(get().progress * 100)) set({ progress });
        };

        /** Downloads file `i`, skipping ones already verified and moved in place by an earlier try. */
        const next = (model: M, i: number) => {
          const files = filesOf(model);
          while (i < files.length && modelFile(files[i]).exists) i++;
          if (i === files.length) return void finish(model);
          const part = partFile(files[i]);
          part.parentDirectory.create({ intermediates: true, idempotent: true });
          if (part.exists) part.delete();
          set({ fileIndex: i });
          task = File.createDownloadTask(files[i].url, part, { onProgress });
          void run(model, i, task.downloadAsync());
        };

        const finish = (model: M) => {
          // Switching in Settings: the new model replaces the old one, so a small phone never holds two.
          // No unload: an answer mid-stream keeps its mapped file; the next question loads the new path.
          const prev = get().installedId;
          if (prev && prev !== model.id) removeFiles(byId(prev));
          set({ status: 'ready', installedId: model.id, progress: 1, fileIndex: 0 });
        };

        const run = async (model: M, i: number, op: Promise<File | null>) => {
          set({ status: 'downloading', paused: null });
          try {
            const file = await op;
            if (!file) {
              set({ status: 'paused', paused: task?.savable() ?? null });
              return;
            }
            task = null;
            const expected = filesOf(model)[i];
            const part = partFile(expected);
            if (!(await verify(part, expected))) {
              part.delete();
              set({ status: 'failed', progress: 0 });
              return;
            }
            const final = modelFile(expected);
            if (final.exists) final.delete();
            part.move(final);
            next(model, i + 1);
          } catch {
            // shortcut: a dropped connection (or the app being killed mid-download) leaves no resume data, so Retry
            // starts that file over; only Pause survives. Save task.savable() on AppState 'background' if testers hit this.
            task = null;
            set({ status: 'failed' });
          }
        };

        return {
          installedId: null,
          activeId: null,
          fileIndex: 0,
          paused: null,
          status: 'available',
          progress: 0,

          start: (model) => {
            task?.cancel();
            // Switching models after a pause: drop the old partial download so it doesn't hold storage.
            const prev = get().activeId;
            if (prev && prev !== model.id && prev !== get().installedId) removeFiles(byId(prev));
            modelsDir().create({ intermediates: true, idempotent: true });
            set({ activeId: model.id, progress: 0, fileIndex: 0 });
            next(model, 0);
          },

          pause: () => task?.pause(),

          resume: () => {
            const { activeId, paused, fileIndex } = get();
            if (!activeId) return;
            const model = byId(activeId);
            if (task?.state === 'paused') return void run(model, fileIndex, task.resumeAsync());
            if (!paused) return next(model, fileIndex);
            task = DownloadTask.fromSavable(paused, { onProgress });
            void run(model, fileIndex, task.resumeAsync());
          },
        };
      },
      {
        name,
        storage: createJSONStorage(() => storage),
        partialize: ({ installedId, activeId, fileIndex, paused, progress }) => ({
          installedId,
          activeId,
          fileIndex,
          paused,
          progress,
        }),
        // Status isn't persisted: derive it so a restart shows ready or paused, never a dead "downloading".
        merge: (saved, current) => {
          const s = { ...current, ...(saved as Partial<Models>) };
          const installed = s.installedId !== null && filesOf(byId(s.installedId)).every((f) => modelFile(f).exists);
          return {
            ...s,
            fileIndex: s.fileIndex ?? 0,
            installedId: installed ? s.installedId : null,
            status: installed ? 'ready' : s.paused ? 'paused' : s.activeId ? 'failed' : 'available',
          };
        },
      },
    ),
  );
}

export const useModels = createDownloadStore<ModelId, Model>('models', modelById);

/** Path of the verified model to pass to the engine, or null when none is installed. */
export function installedModelPath() {
  const id = useModels.getState().installedId;
  return id ? toPath(modelFile(filesOf(modelById(id))[0]).uri) : null;
}
