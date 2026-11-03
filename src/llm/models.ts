// Model catalog. Sizes and sha256 come from the Hugging Face file listing (LFS oid).
export type ModelId = 'lite' | 'plus';

export type Model = {
  id: ModelId;
  name: string;
  description: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  /** Phones report less than their box size (a "4 GB" phone shows ~3.6), so these sit below it. */
  minRamGB: number;
};

export const MODELS: Model[] = [
  {
    id: 'plus',
    name: 'Lucid',
    description: 'Best answers · needs 4 GB phone',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeBytes: 1_117_320_736,
    sha256: '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
    minRamGB: 3.5,
  },
  {
    id: 'lite',
    name: 'Lucid Lite',
    description: 'Fast · for smaller phones',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    fileName: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeBytes: 491_400_032,
    sha256: '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db',
    minRamGB: 2,
  },
];

export const modelById = (id: ModelId) => MODELS.find((m) => m.id === id) ?? MODELS[0];

/** The biggest model this phone can run; unknown RAM (0) gets the default. */
export function recommendedModel(ramGB: number, catalog: Model[] = MODELS): Model {
  return catalog.find((m) => ramGB === 0 || ramGB >= m.minRamGB) ?? catalog[catalog.length - 1];
}
