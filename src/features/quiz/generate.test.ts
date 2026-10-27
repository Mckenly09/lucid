import { useModels } from '@/features/models/store';
import * as engine from '@/llm/engine';

import { makeQuiz } from './generate';

// Never load a real model in tests (AGENTS.md).
jest.mock('@/llm/engine', () => ({ load: jest.fn(), generate: jest.fn() }));
jest.mock('@/features/models/services/files', () => ({ modelFile: () => ({ uri: 'file:///m.gguf' }), toPath: (u: string) => u }));
jest.mock('@/features/models/store', () => ({ useModels: { getState: jest.fn() } }));

const mocked = jest.mocked(engine);
const good = JSON.stringify({
  questions: [1, 2, 3].map((n) => ({ question: `Q${n}`, answer: `a${n}`, wrong: ['x', 'y', 'z'], why: '' })),
});
const replies = (...texts: string[]) =>
  texts.forEach((t) => mocked.generate.mockReturnValueOnce({ stop: jest.fn(), done: Promise.resolve(t) }));

beforeEach(() => {
  jest.resetAllMocks();
  mocked.load.mockResolvedValue();
  jest.mocked(useModels.getState).mockReturnValue({ installedId: 'lite' } as ReturnType<typeof useModels.getState>);
});

it('retries once after bad JSON, then returns the quiz', async () => {
  replies('not json', good);
  const result = await makeQuiz('Plants make food.').done;
  expect(mocked.generate).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({ questions: expect.any(Array) });
});

it('gives up after two bad tries', async () => {
  replies('{}', '{"questions": []}');
  expect(await makeQuiz('Plants make food.').done).toEqual({ error: 'invalid' });
  expect(mocked.generate).toHaveBeenCalledTimes(2);
});

it('reports a missing model or a failed load without generating', async () => {
  jest.mocked(useModels.getState).mockReturnValue({ installedId: null } as ReturnType<typeof useModels.getState>);
  expect(await makeQuiz('x').done).toEqual({ error: 'no-model' });
  jest.mocked(useModels.getState).mockReturnValue({ installedId: 'lite' } as ReturnType<typeof useModels.getState>);
  mocked.load.mockRejectedValue(new Error('oom'));
  expect(await makeQuiz('x').done).toEqual({ error: 'load' });
  expect(mocked.generate).not.toHaveBeenCalled();
});

it('does not retry after Stop', async () => {
  const stop = jest.fn();
  let finish: (t: string) => void = () => {};
  mocked.generate.mockReturnValueOnce({ stop, done: new Promise((r) => (finish = r)) });
  const run = makeQuiz('x');
  await Promise.resolve(); // let the load resolve
  await Promise.resolve();
  run.stop();
  finish('');
  expect(await run.done).toEqual({ error: 'stopped' });
  expect(stop).toHaveBeenCalled();
  expect(mocked.generate).toHaveBeenCalledTimes(1);
});
