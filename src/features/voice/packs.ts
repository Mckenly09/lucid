import type { DownloadFile } from '@/features/models/services/files';

// Voice packs: multilingual Whisper models in ONNX, int8, read by nobodywho's speech-to-text (never `.en`, which has no
// Filipino). Each pack is a folder: the files nobodywho loads, at the paths it expects. URLs are pinned to one commit,
// and sizes and sha256 come from the Hugging Face listing (LFS oid) or, for the small JSON files, from hashing them.
export type VoicePackId = 'voice-lite' | 'voice';

export type VoicePack = {
  id: VoicePackId;
  name: string;
  description: string;
  /** Folder under the models directory; nobodywho loads it as a local model. */
  dir: string;
  sizeBytes: number;
  files: DownloadFile[];
  minRamGB: number;
};

type Spec = [path: string, sizeBytes: number, sha256: string];

function pack(p: Omit<VoicePack, 'files' | 'sizeBytes'> & { repo: string; commit: string; specs: Spec[] }): VoicePack {
  const { repo, commit, specs, ...rest } = p;
  const files = specs.map(([path, sizeBytes, sha256]) => ({
    url: `https://huggingface.co/${repo}/resolve/${commit}/${path}`,
    fileName: `${p.dir}/${path}`,
    sizeBytes,
    sha256,
  }));
  return { ...rest, files, sizeBytes: files.reduce((n, f) => n + f.sizeBytes, 0) };
}

// Same in both repos: the multilingual tokenizer and the audio preprocessor settings.
const TOKENIZER: Spec = [
  'tokenizer.json',
  2_480_466,
  '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566',
];
const PREPROCESSOR: Spec = [
  'preprocessor_config.json',
  339,
  'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d',
];

export const VOICE_PACKS: VoicePack[] = [
  pack({
    id: 'voice',
    name: 'Voice',
    description: 'Better for Filipino · needs 4 GB phone',
    dir: 'whisper-base',
    repo: 'onnx-community/whisper-base',
    commit: '1846881b6b3a3024392c1eea3ad983695bc23925',
    specs: [
      ['onnx/encoder_model_int8.onnx', 23_201_297, 'ca6177401f86a2c6b4dc5f7fc02fbca680678906bd0c22f6d89f0b80f124253f'],
      [
        'onnx/decoder_model_merged_int8.onnx',
        53_693_315,
        'fa3ef9902734ce5ae6f9ef2bdb2ba9a6c4b5785b09f4f420ce036573dc9d090b',
      ],
      TOKENIZER,
      ['config.json', 2_243, 'f4d0608f7d918166da7edb3e188de5ef1bfe70d9802e785d271fd88111e9cf4b'],
      ['generation_config.json', 3_832, '61070cf8de25b1e9256e8e102ded49d8d24a8369ed36ef84fdf21549e68125a0'],
      PREPROCESSOR,
    ],
    // Same bar as the bigger AI model: a "4 GB" phone reports ~3.6.
    minRamGB: 3.5,
  }),
  pack({
    id: 'voice-lite',
    name: 'Voice Lite',
    description: 'Smaller · for weaker phones',
    dir: 'whisper-tiny',
    repo: 'onnx-community/whisper-tiny',
    commit: 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',
    specs: [
      ['onnx/encoder_model_int8.onnx', 10_124_977, '03ff3c99ce804f79a42afd6212c9492eb75e55625926de66f8fc192e9567d336'],
      [
        'onnx/decoder_model_merged_int8.onnx',
        30_719_241,
        '25e807a962b6349356d0ea5d0dfe530b7e5bf0e2a484aeca0359d03143faddd3',
      ],
      TOKENIZER,
      ['config.json', 2_243, '46aeea0a406afbeb563fc8e59ca10609203df4299af6a83f73752fef369efd2d'],
      ['generation_config.json', 3_772, 'f5c67e5a4f7102f8cb4d058bc95da276bbc19eeec997267c3bb0f25ef68facd1'],
      PREPROCESSOR,
    ],
    minRamGB: 0,
  }),
];

export const voicePackById = (id: VoicePackId) => VOICE_PACKS.find((p) => p.id === id) ?? VOICE_PACKS[0];

/** Voice on a ≥ 4 GB phone (or unknown RAM), else Voice Lite (v2.md §4). */
export function recommendedVoicePack(ramGB: number): VoicePack {
  return VOICE_PACKS.find((p) => ramGB === 0 || ramGB >= p.minRamGB) ?? VOICE_PACKS[VOICE_PACKS.length - 1];
}
