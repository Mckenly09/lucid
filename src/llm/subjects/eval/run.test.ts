import { generate } from '../../engine';
import { EVAL_SETS } from './grade';
import { type EvalResult, passRate, runEval, speed } from './run';

// Never load a real model in tests (AGENTS.md).
jest.mock('../../engine', () => ({ generate: jest.fn() }));

const cases = EVAL_SETS.math ?? [];

/** Each answer streams its tokens, then repeats the case's expected words so it passes. */
function fakeModel() {
  jest.mocked(generate).mockImplementation(({ onToken, turns }) => {
    const q = turns[turns.length - 1].content;
    // Solver steps or notes come before "Question: …" in some prompts.
    const c = cases.find((x) => q === x.q || q.endsWith(`Question: ${x.q}`));
    const answer = (c?.mustInclude ?? []).map((i) => (Array.isArray(i) ? i[0] : i)).join(' ');
    return {
      stop: () => {},
      done: (async () => {
        for (const t of answer.split(' ')) onToken(`${t} `);
        return answer;
      })(),
    };
  });
}

it('asks every question in the set and grades the answers', async () => {
  fakeModel();
  const seen: number[] = [];
  const results = await runEval('math', (_r, done) => seen.push(done)).done;
  expect(results).toHaveLength(cases.length);
  expect(seen).toEqual(cases.map((_, i) => i + 1));
  expect(passRate(results)).toBe(100);
  expect(results.every((r) => r.firstTokenMs >= 0 && r.tokensPerSec >= 0)).toBe(true);
});

it('stops early when asked', async () => {
  fakeModel();
  const run = runEval('math', () => run.stop());
  expect(await run.done).toHaveLength(1);
});

const result = (pass: boolean, firstTokenMs: number, tokensPerSec: number): EvalResult => ({
  q: 'q',
  answer: 'a',
  pass,
  missing: [],
  forbidden: [],
  firstTokenMs,
  tokensPerSec,
});

it('averages speed and rounds the pass rate', () => {
  const rs = [result(true, 1000, 8), result(false, 2000, 10), result(true, 3000, 9)];
  expect(passRate(rs)).toBe(67);
  expect(speed(rs)).toEqual({ firstTokenMs: 2000, tokensPerSec: 9 });
  expect(speed([])).toBeNull();
  expect(passRate([])).toBe(0);
});
