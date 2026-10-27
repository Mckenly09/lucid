import { MODELS, modelById, recommendedModel } from '@/llm/models';

import { hasRoom, STORAGE_MARGIN_BYTES, verify } from './files';

const lite = modelById('lite');
const plus = modelById('plus');

describe('recommendedModel', () => {
  it('picks the biggest model the phone can run', () => {
    expect(recommendedModel(3.6).id).toBe('plus'); // a "4 GB" phone
    expect(recommendedModel(2.8).id).toBe('lite');
  });

  it('falls back to the smallest model on very weak phones', () => {
    expect(recommendedModel(1).id).toBe(MODELS[MODELS.length - 1].id);
  });

  it('uses the default when RAM is unknown', () => {
    expect(recommendedModel(0).id).toBe(MODELS[0].id);
  });
});

describe('hasRoom', () => {
  it('needs the model size plus a margin', () => {
    expect(hasRoom(lite, lite.sizeBytes + STORAGE_MARGIN_BYTES)).toBe(true);
    expect(hasRoom(lite, lite.sizeBytes + STORAGE_MARGIN_BYTES - 1)).toBe(false);
  });
});

describe('verify', () => {
  // Only the fields verify reads; the real File is native.
  const fakeFile = (size: number, hash: string) =>
    ({ exists: true, size, digest: jest.fn().mockResolvedValue(hash) }) as unknown as Parameters<typeof verify>[0];

  it('accepts the right size and checksum, case-insensitive', async () => {
    await expect(verify(fakeFile(plus.sizeBytes, plus.sha256.toUpperCase()), plus)).resolves.toBe(true);
  });

  it('rejects a wrong checksum', async () => {
    await expect(verify(fakeFile(plus.sizeBytes, lite.sha256), plus)).resolves.toBe(false);
  });

  it('rejects a short file without hashing it', async () => {
    const file = fakeFile(plus.sizeBytes - 1, plus.sha256);
    await expect(verify(file, plus)).resolves.toBe(false);
    expect((file as unknown as { digest: jest.Mock }).digest).not.toHaveBeenCalled();
  });
});
