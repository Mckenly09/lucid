import { File } from 'expo-file-system';

import { MODELS, modelById } from '@/llm/models';

import { installedModelPath, useModels } from './store';

// A fake file system: file name → its sha256. Nothing touches the real disk or network (AGENTS.md: no real model).
const mockFiles = new Map<string, string>();
jest.mock('./services/files', () => {
  class FakeFile {
    readonly name: string;
    constructor(fileName: string) {
      this.name = fileName;
    }
    get exists() {
      return mockFiles.has(this.name);
    }
    get uri() {
      return `file:///doc/models/${this.name}`;
    }
    delete() {
      mockFiles.delete(this.name);
    }
    move(to: FakeFile) {
      mockFiles.set(to.name, mockFiles.get(this.name) ?? '');
      mockFiles.delete(this.name);
    }
  }
  return {
    modelsDir: () => ({ create: () => {} }),
    modelFile: (m: { fileName: string }) => new FakeFile(m.fileName),
    partFile: (m: { fileName: string }) => new FakeFile(`${m.fileName}.part`),
    toPath: (uri: string) => uri.replace(/^file:\/\//, ''),
    verify: async (f: FakeFile, m: { sha256: string }) => mockFiles.get(f.name) === m.sha256,
  };
});
jest.mock('expo-file-system', () => ({ File: { createDownloadTask: jest.fn() }, DownloadTask: { fromSavable: jest.fn() } }));
jest.mock('@/utils/kv-storage', () => ({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));

const lite = modelById('lite');
const plus = modelById('plus');

/** The next download writes `sha` into the part file, or pauses (resolves null) when `pauses`. */
function nextDownload(sha: string, { pauses = false } = {}) {
  jest.mocked(File.createDownloadTask).mockImplementationOnce((_url, part) => {
    const target = part as unknown as { name: string };
    const task = {
      state: 'idle',
      downloadAsync: async () => {
        if (pauses) {
          task.state = 'paused';
          return null;
        }
        mockFiles.set(target.name, sha);
        return part;
      },
      resumeAsync: async () => {
        mockFiles.set(target.name, sha);
        return part;
      },
      savable: () => ({ url: 'u', resumeData: 'r' }),
      pause: () => {},
      cancel: () => {},
    };
    return task as unknown as ReturnType<typeof File.createDownloadTask>;
  });
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockFiles.clear();
  jest.clearAllMocks();
  useModels.setState({ installedId: null, activeId: null, paused: null, status: 'available', progress: 0 });
});

it('installs a download whose checksum matches the catalog', async () => {
  nextDownload(lite.sha256);
  useModels.getState().start(lite);
  await settle();
  expect(useModels.getState()).toMatchObject({ status: 'ready', installedId: 'lite', progress: 1 });
  expect([...mockFiles.keys()]).toEqual([lite.fileName]);
  expect(installedModelPath()).toBe(`/doc/models/${lite.fileName}`);
});

it('throws away a corrupted download instead of installing it', async () => {
  nextDownload('not-the-right-sha');
  useModels.getState().start(lite);
  await settle();
  expect(useModels.getState()).toMatchObject({ status: 'failed', installedId: null });
  expect(mockFiles.size).toBe(0);
  expect(installedModelPath()).toBeNull();
});

it('switching models keeps only the new one on the phone', async () => {
  mockFiles.set(lite.fileName, lite.sha256);
  useModels.setState({ installedId: 'lite', status: 'ready' });
  nextDownload(plus.sha256);
  useModels.getState().start(plus);
  await settle();
  expect(useModels.getState().installedId).toBe('plus');
  expect([...mockFiles.keys()]).toEqual([plus.fileName]);
});

it('keeps the old model when the new download fails', async () => {
  mockFiles.set(lite.fileName, lite.sha256);
  useModels.setState({ installedId: 'lite', status: 'ready' });
  nextDownload('bad');
  useModels.getState().start(plus);
  await settle();
  expect(useModels.getState()).toMatchObject({ status: 'failed', installedId: 'lite' });
  expect(mockFiles.has(lite.fileName)).toBe(true);
});

it('pauses with resume data, then resumes the same download', async () => {
  nextDownload(lite.sha256, { pauses: true });
  useModels.getState().start(lite);
  await settle();
  expect(useModels.getState()).toMatchObject({ status: 'paused', paused: { url: 'u', resumeData: 'r' } });

  useModels.getState().resume();
  await settle();
  expect(useModels.getState()).toMatchObject({ status: 'ready', installedId: 'lite', paused: null });
  expect(File.createDownloadTask).toHaveBeenCalledTimes(1); // resumed, not restarted
});

describe('after a restart', () => {
  const merge = useModels.persist.getOptions().merge!;
  const current = useModels.getState();

  it('shows ready only when the model file is really there', () => {
    mockFiles.set(lite.fileName, lite.sha256);
    expect(merge({ installedId: 'lite' }, current)).toMatchObject({ installedId: 'lite', status: 'ready' });
    mockFiles.clear();
    expect(merge({ installedId: 'lite' }, current)).toMatchObject({ installedId: null, status: 'available' });
  });

  it('never comes back as a dead "downloading"', () => {
    expect(merge({ activeId: 'plus', paused: { url: 'u', resumeData: 'r' } }, current)).toMatchObject({ status: 'paused' });
    expect(merge({ activeId: 'plus', paused: null }, current)).toMatchObject({ status: 'failed' });
  });
});

it('lists both models with a checksum (sanity check of the catalog)', () => {
  expect(MODELS.map((m) => m.id).sort()).toEqual(['lite', 'plus']);
  expect(MODELS.every((m) => /^[0-9a-f]{64}$/.test(m.sha256))).toBe(true);
});
