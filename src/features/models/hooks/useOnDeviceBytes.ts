import { useModels } from '@/features/models/store';
import { voicePackById } from '@/features/voice/packs';
import { useVoicePacks } from '@/features/voice/store';
import { modelById } from '@/llm/models';

/** Space the on-device AI takes: the AI model plus the voice pack (Library's "AI and voice" bar, Settings → Storage). */
export function useOnDeviceBytes() {
  const modelId = useModels((s) => s.installedId);
  const voiceId = useVoicePacks((s) => s.installedId);
  return (modelId ? modelById(modelId).sizeBytes : 0) + (voiceId ? voicePackById(voiceId).sizeBytes : 0);
}
