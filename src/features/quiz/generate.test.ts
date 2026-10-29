import { installedModelPath } from '@/features/models/store';
import * as engine from '@/llm/engine';

import { makeQuiz } from './generate';

// Never load a real model in tests (AGENTS.md).
jest.mock('@/llm/engine', () => ({ load: jest.fn(), generate: jest.fn(), countTokens: jest.fn() }));
jest.mock('@/features/models/store', () => ({ installedModelPath: jest.fn() }));

const mocked = jest.mocked(engine);
const good = JSON.stringify({
  questions: [1, 2, 3].map((n) => ({ question: `Q${n}`, answer: `a${n}`, wrong: ['x', 'y', 'z'], why: '' })),
});
const replies = (...texts: string[]) =>
  texts.forEach((t) => mocked.generate.mockReturnValueOnce({ stop: jest.fn(), done: Promise.resolve(t) }));

beforeEach(() => {
  jest.resetAllMocks();
  mocked.load.mockResolvedValue();
  mocked.countTokens.mockImplementation(async (t) => t.length);
  jest.mocked(installedModelPath).mockReturnValue('file:///m.gguf');
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
  jest.mocked(installedModelPath).mockReturnValue(null);
  expect(await makeQuiz('x').done).toEqual({ error: 'no-model' });
  jest.mocked(installedModelPath).mockReturnValue('file:///m.gguf');
  mocked.load.mockRejectedValue(new Error('oom'));
  expect(await makeQuiz('x').done).toEqual({ error: 'load' });
  expect(mocked.generate).not.toHaveBeenCalled();
});

it('does not retry after Stop', async () => {
  const stop = jest.fn();
  let finish: (t: string) => void = () => {};
  mocked.generate.mockReturnValueOnce({ stop, done: new Promise((r) => (finish = r)) });
  const run = makeQuiz('x');
  await new Promise((r) => setTimeout(r, 0)); // let the load and token count resolve
  run.stop();
  finish('');
  expect(await run.done).toEqual({ error: 'stopped' });
  expect(stop).toHaveBeenCalled();
  expect(mocked.generate).toHaveBeenCalledTimes(1);
});

it('shortens a long answer until it fits the context', async () => {
  replies(good);
  await makeQuiz('a'.repeat(2000)).done;
  const prompt = mocked.generate.mock.calls[0][0].turns[0].content;
  expect(prompt.length).toBeLessThan(1200 + 100);
  expect(prompt).toContain('a'.repeat(800));
});

it('reports each question as the model starts it', async () => {
  const seen: number[] = [];
  mocked.generate.mockImplementationOnce(({ onToken }) => {
    ['{"questions":[{"question":"Q1"', ',{"question":"Q2"'].forEach(onToken);
    return { stop: jest.fn(), done: Promise.resolve(good) };
  });
  await makeQuiz('Plants make food.', (n) => seen.push(n)).done;
  expect(seen).toEqual([0, 1, 2]);
});
