import { makeQuiz } from '@/features/quiz/generate';
import type { QuizQuestion } from '@/features/quiz/services/parse';

import { runPractice, SESSION_SIZE } from './generate';

jest.mock('@/features/quiz/generate', () => ({ makeQuiz: jest.fn() }));

const q = (question: string, answer: string): QuizQuestion => ({
  question,
  choices: [answer, 'wrong 1', 'wrong 2', 'wrong 3'],
  correct: 0,
  why: '',
});
// Each batch's chunk mentions "magma", so questions answered "Magma" pass the source check.
const chunks = () => [{ title: 'Volcanoes', text: 'Magma rises through the crust.' }];

type Result = { questions: QuizQuestion[] } | { error: 'invalid' | 'no-model' | 'load' | 'stopped' };
function batches(...results: Result[]) {
  const queue = [...results];
  jest.mocked(makeQuiz).mockImplementation(() => ({
    stop: jest.fn(),
    done: Promise.resolve(queue.shift() ?? { error: 'invalid' as const }),
  }));
}
const good = (from: number, n = 4) => ({ questions: Array.from({ length: n }, (_, i) => q(`Q${from + i}?`, 'Magma')) });

function run(cached: QuizQuestion[] = []) {
  const shown: QuizQuestion[] = [];
  const fresh: QuizQuestion[] = [];
  const r = runPractice({
    cached,
    pickChunks: chunks,
    onQuestion: (x) => shown.push(x),
    onFresh: (xs) => fresh.push(...xs),
    random: () => 0.5,
  });
  return { ...r, shown, fresh };
}

beforeEach(() => jest.mocked(makeQuiz).mockReset());

it('fills a 10-question session from new batches and hands checked ones to the cache', async () => {
  batches(good(0), good(4), good(8));
  const s = run();
  expect(await s.done).toEqual({ total: SESSION_SIZE });
  expect(s.shown.map((x) => x.question)).toEqual(Array.from({ length: 10 }, (_, i) => `Q${i}?`));
  expect(s.fresh).toHaveLength(12);
});

it('shows up to half from the cache first, then makes the rest', async () => {
  const cached = Array.from({ length: 8 }, (_, i) => q(`Cached ${i}?`, 'Magma'));
  batches(good(0), good(4));
  const s = run(cached);
  expect(await s.done).toEqual({ total: 10 });
  expect(s.shown.slice(0, 5).every((x) => x.question.startsWith('Cached'))).toBe(true);
  expect(s.shown.slice(5).every((x) => x.question.startsWith('Q'))).toBe(true);
  // Cached choices are reshuffled, and still marked right.
  for (const x of s.shown) expect(x.choices[x.correct]).toBe('Magma');
});

it('drops questions the source does not back, and repeats', async () => {
  batches({ questions: [q('Q0?', 'Magma'), q('Q1?', 'Ribosomes'), q('Q0?', 'Magma'), q('Q2?', 'Magma')] }, good(10));
  const s = run();
  await s.done;
  expect(s.shown.map((x) => x.question)).toEqual(['Q0?', 'Q2?', 'Q10?', 'Q11?', 'Q12?', 'Q13?']);
  expect(s.fresh.map((x) => x.question)).not.toContain('Q1?');
});

it('retries a failed batch once, then ends short instead of failing', async () => {
  batches(good(0), { error: 'invalid' }, { error: 'invalid' }, good(99));
  const s = run();
  expect(await s.done).toEqual({ total: 4 });
  expect(makeQuiz).toHaveBeenCalledTimes(3);
});

it('tops up from the rest of the cache when making questions fails', async () => {
  const cached = Array.from({ length: 8 }, (_, i) => q(`Cached ${i}?`, 'Magma'));
  batches({ error: 'invalid' }, { error: 'invalid' });
  const s = run(cached);
  expect(await s.done).toEqual({ total: 8 });
});

it('reports the model error when nothing could be shown', async () => {
  batches({ error: 'no-model' });
  expect(await run().done).toEqual({ error: 'no-model' });
});

it('plays the cached questions when the model will not load', async () => {
  batches({ error: 'load' });
  const s = run([q('Cached?', 'Magma')]);
  expect(await s.done).toEqual({ total: 1 });
  expect(makeQuiz).toHaveBeenCalledTimes(1);
});

it('stops the running batch', async () => {
  const stop = jest.fn();
  jest.mocked(makeQuiz).mockReturnValue({ stop, done: new Promise(() => {}) });
  const s = run();
  await Promise.resolve();
  s.stop();
  expect(stop).toHaveBeenCalled();
});
