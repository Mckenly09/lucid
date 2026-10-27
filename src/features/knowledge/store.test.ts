import { File } from 'expo-file-system';

import { closePack } from './pack-files';
import type { CatalogPack } from './services/catalog';
import { usePacks } from './store';

// A fake file system: file name → the sha256 of its bytes. Nothing touches the real disk (or network).
const mockFiles = new Map<string, string>();
jest.mock('./pack-files', () => {
  class FakeFile {
    constructor(public name: string) {}
    get exists() {
      return mockFiles.has(this.name);
    }
    delete() {
      mockFiles.delete(this.name);
    }
    move(to: FakeFile) {
      mockFiles.set(to.name, mockFiles.get(this.name) ?? '');
      mockFiles.delete(this.name);
    }
    async digest() {
      return mockFiles.get(this.name) ?? '';
    }
  }
  const name = (p: { id: string; version: number }) => `${p.id}-v${p.version}.sqlite`;
  return {
    packFile: (p: { id: string; version: number }) => new FakeFile(name(p)),
    packPartFile: (p: { id: string; version: number }) => new FakeFile(`${name(p)}.part`),
    packsDir: () => ({ create: () => {} }),
    closePack: jest.fn(),
  };
});
jest.mock('expo-file-system', () => ({ File: { createDownloadTask: jest.fn() }, DownloadTask: {} }));
jest.mock('@/utils/kv-storage', () => ({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));

const pack = (version: number, sha: string): CatalogPack => ({
  id: 'science-chem',
  name: 'Science · Chemistry',
  subject: 'science',
  grades: [7, 8, 9, 10],
  version,
  sizeMB: 1.2,
  sha256: sha.repeat(64),
  url: 'https://raw.githubusercontent.com/Mckenly09/lucid-packs/main/packs/science-chem.sqlite',
  license: 'CC BY-NC-SA 4.0',
  attribution: 'OpenStax',
});

/** The next download writes a file whose sha256 is `sha` (64 × that character). */
function nextDownload(sha: string) {
  jest.mocked(File.createDownloadTask).mockImplementationOnce((_url, part) => {
    const target = part as unknown as { name: string };
    return {
      downloadAsync: async () => {
        mockFiles.set(target.name, sha.repeat(64));
        return part;
      },
      cancel: () => {},
    } as unknown as ReturnType<typeof File.createDownloadTask>;
  });
}

/** Lets the download's promise chain finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockFiles.clear();
  jest.clearAllMocks();
  usePacks.setState({ installed: {}, active: null, status: null, progress: 0, paused: null });
});

it('installs a download whose checksum matches the catalog', async () => {
  nextDownload('a');
  usePacks.getState().download(pack(1, 'a'));
  await settle();
  expect(usePacks.getState()).toMatchObject({ status: null, active: null });
  expect(usePacks.getState().installed['science-chem'].version).toBe(1);
  expect([...mockFiles.keys()]).toEqual(['science-chem-v1.sqlite']);
});

it('keeps the installed pack when an update fails its checksum', async () => {
  mockFiles.set('science-chem-v1.sqlite', 'a'.repeat(64));
  usePacks.setState({ installed: { 'science-chem': pack(1, 'a') } });

  nextDownload('x'); // corrupted: not the catalog's sha256
  usePacks.getState().download(pack(2, 'b'));
  await settle();

  expect(usePacks.getState().status).toBe('failed');
  expect(usePacks.getState().installed['science-chem'].version).toBe(1);
  expect([...mockFiles.keys()]).toEqual(['science-chem-v1.sqlite']); // old file kept, bad download removed
  expect(closePack).not.toHaveBeenCalled();
});

it('replaces the old version only after the update checks out', async () => {
  mockFiles.set('science-chem-v1.sqlite', 'a'.repeat(64));
  usePacks.setState({ installed: { 'science-chem': pack(1, 'a') } });

  nextDownload('b');
  usePacks.getState().download(pack(2, 'b'));
  await settle();

  expect(usePacks.getState().installed['science-chem'].version).toBe(2);
  expect([...mockFiles.keys()]).toEqual(['science-chem-v2.sqlite']);
  expect(closePack).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
});

it('deletes an installed pack and its file', () => {
  mockFiles.set('science-chem-v1.sqlite', 'a'.repeat(64));
  usePacks.setState({ installed: { 'science-chem': pack(1, 'a') } });
  usePacks.getState().remove('science-chem');
  expect(usePacks.getState().installed).toEqual({});
  expect(mockFiles.size).toBe(0);
  expect(closePack).toHaveBeenCalled();
});
