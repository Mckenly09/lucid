import { Directory, File, Paths } from 'expo-file-system';

/** One file to fetch: where from, where it lands (may include folders), and how to check it. */
export type DownloadFile = { url: string; fileName: string; sizeBytes: number; sha256: string };

/**
 * What a download needs from a catalog entry: one file (AI model), or several fetched one after another (a voice
 * pack is a folder of model files). `sizeBytes` is the total either way.
 */
export type Download<Id extends string = string> = { id: Id; sizeBytes: number } & (
  Omit<DownloadFile, 'sizeBytes'> | { files: DownloadFile[] }
);

export const filesOf = (d: Download): DownloadFile[] => ('files' in d ? d.files : [d as DownloadFile]);

/** Room left for chats, packs and the OS after the model lands. */
export const STORAGE_MARGIN_BYTES = 300 * 1024 ** 2;

export const hasRoom = (model: Download, freeBytes: number) => freeBytes >= model.sizeBytes + STORAGE_MARGIN_BYTES;

export const modelsDir = () => new Directory(Paths.document, 'models');
export const modelFile = (file: DownloadFile) => new File(modelsDir(), file.fileName);
/** Downloads land here and only move to `modelFile` after the checksum passes. */
export const partFile = (file: DownloadFile) => new File(modelsDir(), `${file.fileName}.part`);

/** The runtime wants a plain filesystem path, not a file:// URI. */
export const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ''));

/** Size first so a short file fails fast without hashing a gigabyte. */
export async function verify(file: File, expected: DownloadFile) {
  if (!file.exists || file.size !== expected.sizeBytes) return false;
  return (await file.digest('SHA-256')).toLowerCase() === expected.sha256;
}
