import { generate } from '../../engine';
import { buildPrompt } from '../../prompts';
import type { SubjectId } from '../config';
import { type EvalCase, EVAL_SETS, grade } from './grade';

export type EvalResult = { q: string; answer: string; pass: boolean; missing: string[]; forbidden: string[] };

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
      current = generate({ ...buildPrompt({ subjectId, question: c.q }), onToken: () => {} });
      const answer = await current.done;
      if (stopped) break;
      const r = { q: c.q, answer, ...grade(answer, c) };
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

export const passRate = (results: EvalResult[]) =>
  results.length ? Math.round((results.filter((r) => r.pass).length / results.length) * 100) : 0;
