import { SpeechToText } from 'react-native-nobodywho';

import { loadStt, transcribePcm, unloadStt } from './stt';

// Never loads a real Whisper: each load hands back a fake with its own destroy, resolved when the test says so.
jest.mock('react-native-nobodywho', () => ({ SpeechToText: { load: jest.fn() } }));

type Fake = { destroy: jest.Mock; transcribePcm: jest.Mock };
const loads: { opts: unknown; resolve: (f: Fake) => void; fake: Fake }[] = [];
const fake = (text = 'Ano ang mitosis'): Fake => ({
  destroy: jest.fn(),
  transcribePcm: jest.fn(() => ({ completed: async () => ` ${text} ` })),
});

beforeEach(() => {
  unloadStt();
  loads.length = 0;
  jest.mocked(SpeechToText.load).mockImplementation(
    (opts) =>
      new Promise((resolve) => {
        const f = fake();
        loads.push({ opts, resolve: () => resolve(f as unknown as SpeechToText), fake: f });
      }),
  );
});

const settle = () => new Promise((r) => setTimeout(r, 0));

it('two calls at once share one load, and the same language loads only once', async () => {
  const a = loadStt('/models/whisper-base', 'tl');
  const b = loadStt('/models/whisper-base', 'tl');
  expect(loads).toHaveLength(1);
  loads[0].resolve(loads[0].fake);
  expect(await a).toBe(await b);
  await loadStt('/models/whisper-base', 'tl');
  expect(loads).toHaveLength(1);
  expect(loads[0].opts).toEqual({ source: '/models/whisper-base', language: 'tl', quantization: 'int8' });
});

it('a new language frees the old model and loads again; auto means no language', async () => {
  const first = loadStt('/models/whisper-base', 'en');
  loads[0].resolve(loads[0].fake);
  await first;
  const second = loadStt('/models/whisper-base', 'auto');
  expect(loads[0].fake.destroy).toHaveBeenCalled();
  loads[1].resolve(loads[1].fake);
  await second;
  expect(loads[1].opts).toMatchObject({ language: undefined });
});

it('cancelling while Whisper still loads frees it as soon as it arrives', async () => {
  const load = loadStt('/models/whisper-base', 'auto');
  unloadStt();
  loads[0].resolve(loads[0].fake);
  await expect(load).rejects.toThrow('unloaded');
  expect(loads[0].fake.destroy).toHaveBeenCalled();
  // Nothing is left loaded: the next call loads again.
  void loadStt('/models/whisper-base', 'auto');
  await settle();
  expect(loads).toHaveLength(2);
});

it('transcribes with the loaded model and trims the text', async () => {
  const text = transcribePcm(new Int16Array(16), 16_000, '/models/whisper-base', 'auto');
  await settle();
  loads[0].resolve(loads[0].fake);
  expect(await text).toBe('Ano ang mitosis');
  expect(loads[0].fake.transcribePcm).toHaveBeenCalledWith(expect.any(Int16Array), 16_000);
});
