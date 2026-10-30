import { Directory } from 'expo-file-system';

import { createDownloadStore } from '@/features/models/store';
import { modelsDir, toPath } from '@/features/models/services/files';

import { type VoicePack, type VoicePackId, voicePackById } from './packs';

export const useVoicePacks = createDownloadStore<VoicePackId, VoicePack>('voice-packs', voicePackById);

/** Folder of the verified voice pack (nobodywho loads the folder), or null when none is installed. */
export function installedVoicePath() {
  const id = useVoicePacks.getState().installedId;
  return id ? toPath(new Directory(modelsDir(), voicePackById(id).dir).uri) : null;
}
