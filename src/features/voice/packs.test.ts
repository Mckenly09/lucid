import { recommendedVoicePack, VOICE_PACKS } from './packs';

it('every voice pack file is pinned and checkable', () => {
  for (const p of VOICE_PACKS) {
    expect(p.sizeBytes).toBe(p.files.reduce((n, f) => n + f.sizeBytes, 0));
    for (const f of p.files) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      // A fixed commit, never `main`, so a file can't change under its checksum.
      expect(f.url).toMatch(/^https:\/\/huggingface\.co\/onnx-community\/whisper-(tiny|base)\/resolve\/[0-9a-f]{40}\//);
      expect(f.fileName.startsWith(`${p.dir}/`)).toBe(true);
    }
    // What nobodywho loads with quantization 'int8'.
    expect(p.files.map((f) => f.fileName.slice(p.dir.length + 1))).toEqual(
      expect.arrayContaining(['onnx/encoder_model_int8.onnx', 'onnx/decoder_model_merged_int8.onnx', 'tokenizer.json']),
    );
  }
});

it('never uses an English-only (.en) model, which has no Filipino', () => {
  expect(VOICE_PACKS.flatMap((p) => p.files).some((f) => /\.en\b/.test(f.url))).toBe(false);
});

it('recommends Voice on a 4 GB phone and Voice Lite below', () => {
  expect(recommendedVoicePack(3.6).id).toBe('voice');
  expect(recommendedVoicePack(2.8).id).toBe('voice-lite');
});
