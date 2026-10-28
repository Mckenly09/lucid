import { generate } from '../../engine';
import { buildPrompt } from '../../prompts';
import type { SubjectId } from '../config';
import { type EvalCase, EVAL_SETS, grade } from './grade';

export type EvalResult = {
  q: string;
  answer: string;
  pass: boolean;
  missing: string[];
  forbidden: string[];
  /** Speed on this phone: ms until the first token, and tokens per second after it. */
  firstTokenMs: number;
  tokensPerSec: number;
};

/**
 * Asks every question in a subject's set through the app's real prompt path (model must be loaded) and grades
 * the raw answers, before the calculator marks anything. Call `stop()` to end early.
 */
export function runEval(subjectId: SubjectId, onResult: (r: EvalResult, done: number, total: number) => void) {
  const cases: EvalCase[] = EVAL_SETS[subjectId] ?? [];
  let stopped = false;
  let current: ReturnType<typeof generate> | null = null;

  const done = (async () => {
    const results: EvalResult[] = [];
    for (const c of cases) {
      if (stopped) break;
      const start = Date.now();
      let first = 0;
      let tokens = 0;
      current = generate({
        ...buildPrompt({ subjectId, question: c.q }),
        onToken: () => {
          if (!tokens++) first = Date.now();
        },
      });
      const answer = await current.done;
      if (stopped) break;
      const end = Date.now();
      const r = {
        q: c.q,
        answer,
        ...grade(answer, c),
        firstTokenMs: first ? first - start : end - start,
        tokensPerSec: tokens > 1 ? ((tokens - 1) * 1000) / Math.max(1, end - first) : 0,
      };
      results.push(r);
      onResult(r, results.length, cases.length);
    }
    return results;
  })();

  return {
    done,
    stop: () => {
      stopped = true;
      current?.stop();
    },
  };
}

/** Average speed of a run, for the Eval screen. */
export function speed(results: EvalResult[]) {
  if (!results.length) return null;
  const avg = (f: (r: EvalResult) => number) => results.reduce((sum, r) => sum + f(r), 0) / results.length;
  return { firstTokenMs: Math.round(avg((r) => r.firstTokenMs)), tokensPerSec: Math.round(avg((r) => r.tokensPerSec) * 10) / 10 };
}

export const passRate = (results: EvalResult[]) =>
  results.length ? Math.round((results.filter((r) => r.pass).length / results.length) * 100) : 0;
