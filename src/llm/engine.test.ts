import { Model } from 'react-native-nobodywho';

import { generate, isLoaded, load, unload } from './engine';

// The runtime is native; this fake streams tokens until stopGeneration() ends the streams running at that moment.
const mockDestroyed: string[] = [];
const mockStreams: { stopped: boolean }[] = [];
const mockSteps: string[] = [];

jest.mock('react-native-nobodywho', () => ({
  SamplerPresets: { constrainWithJsonSchema: () => ({}) },
  // Fluent builder: every step records its name and returns itself, dist() ends the chain.
  SamplerBuilder: jest.fn().mockImplementation(function (this: Record<string, unknown>) {
    for (const step of ['penalties', 'dry', 'topK', 'topP', 'minP', 'temperature'])
      this[step] = () => {
        mockSteps.push(step);
        return this;
      };
    this.dist = () => ({});
  }),
  Model: {
    load: jest.fn(async ({ modelPath }: { modelPath: string }) => ({
      destroy: () => mockDestroyed.push(`model:${modelPath}`),
    })),
  },
  Chat: jest.fn().mockImplementation(() => ({
    destroy: () => mockDestroyed.push('chat'),
    stopGeneration: () => mockStreams.forEach((st) => (st.stopped = true)),
    complete: () => {
      let i = 0;
      const st = { stopped: false };
      mockStreams.push(st);
      const next = async () =>
        i < 100 && !st.stopped ? { done: false, value: `t${i++} ` } : { done: true, value: undefined };
      return { [Symbol.asyncIterator]: () => ({ next }) };
    },
  })),
}));

const ask = (maxTokens?: number) =>
  generate({
    system: 'sys',
    turns: [{ role: 'user', content: '1 + 1' }],
    onToken: () => {},
    maxTokens,
  });

beforeEach(() => {
  unload();
  mockDestroyed.length = 0;
  mockStreams.length = 0;
  jest.mocked(Model.load).mockClear();
});

it('refuses to generate before a model is loaded', () => {
  expect(() => ask()).toThrow('No model loaded');
});

it('shares one load between concurrent calls', async () => {
  await Promise.all([load('/a.gguf'), load('/a.gguf')]);
  expect(Model.load).toHaveBeenCalledTimes(1);
  expect(isLoaded('/a.gguf')).toBe(true);
});

it('releases the old model before loading another', async () => {
  await load('/a.gguf');
  await load('/b.gguf');
  expect(mockDestroyed).toEqual(['chat', 'model:/a.gguf']);
  expect(isLoaded('/b.gguf')).toBe(true);
});

it('streams tokens and stops at the token cap', async () => {
  await load('/a.gguf');
  const text = await ask(3).done;
  expect(text).toBe('t0 t1 t2 ');
});

it('Stop ends the answer and keeps what was written', async () => {
  await load('/a.gguf');
  const tokens: string[] = [];
  const g = generate({
    system: 'sys',
    turns: [{ role: 'user', content: 'hi' }],
    onToken: (t) => {
      tokens.push(t);
      if (tokens.length === 2) g.stop();
    },
  });
  await expect(g.done).resolves.toBe('t0 t1 ');
  g.stop(); // a second Stop is harmless
});

it('a new question stops the previous answer', async () => {
  await load('/a.gguf');
  const first = ask();
  const second = ask(2);
  await expect(second.done).resolves.toBe('t0 t1 ');
  expect((await first.done).length).toBeLessThan(10);
});

describe('sampler', () => {
  const answer = (opts: { temperature?: number; jsonSchema?: object }) =>
    generate({ system: 'sys', turns: [{ role: 'user', content: 'hi' }], onToken: () => {}, maxTokens: 1, ...opts }).done;

  beforeEach(async () => {
    await load('/a.gguf');
    mockSteps.length = 0;
  });

  it('blocks repeats in language answers (the Filipino loop)', async () => {
    await answer({ temperature: 0.4 });
    expect(mockSteps).toEqual(expect.arrayContaining(['penalties', 'dry', 'temperature']));
  });

  it('lets math and science restate numbers but still blocks loops', async () => {
    await answer({ temperature: 0.1 });
    expect(mockSteps).toContain('temperature');
    expect(mockSteps).not.toContain('penalties');
    expect(mockSteps).toContain('dry');
  });

  it('Quiz me keeps the JSON-schema sampler', async () => {
    await answer({ jsonSchema: { type: 'object' } });
    expect(mockSteps).toEqual([]);
  });
});
