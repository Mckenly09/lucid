import { Directory, File, Paths } from 'expo-file-system';

import type { Model } from '@/llm/models';

/** Room left for chats, packs and the OS after the model lands. */
export const STORAGE_MARGIN_BYTES = 300 * 1024 ** 2;

export const hasRoom = (model: Model, freeBytes: number) => freeBytes >= model.sizeBytes + STORAGE_MARGIN_BYTES;

export const modelsDir = () => new Directory(Paths.document, 'models');
export const modelFile = (model: Model) => new File(modelsDir(), model.fileName);
/** Downloads land here and only move to `modelFile` after the checksum passes. */
export const partFile = (model: Model) => new File(modelsDir(), `${model.fileName}.part`);

/** The runtime wants a plain filesystem path, not a file:// URI. */
export const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ''));

/** Size first so a short file fails fast without hashing a gigabyte. */
export async function verify(file: File, model: Model) {
  if (!file.exists || file.size !== model.sizeBytes) return false;
  return (await file.digest('SHA-256')).toLowerCase() === model.sha256;
}
