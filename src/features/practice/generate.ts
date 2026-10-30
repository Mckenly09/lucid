import { makeQuiz, type QuizError, type QuizRun } from '@/features/quiz/generate';
import { type QuizQuestion, shuffle } from '@/features/quiz/services/parse';

import { supportedBySource } from './services/check';

/** Questions per session (v2.md §3). */
export const SESSION_SIZE = 10;
/** v2.md asks for 3–5; 3 chunks (~600 words) fit the quiz prompt's token budget without being cut much. */
const CHUNKS_PER_BATCH = 3;
/** A batch that gives nothing is retried once, then the session ends with what it has (v2.md: "retry once, then skip"). */
const MAX_EMPTY_BATCHES = 2;

export type Chunk = { title: string; text: string };
export type PracticeRun = { stop: () => void; done: Promise<{ total: number } | { error: QuizError }> };

/** A cached question with its choices in a new order, so a repeat isn't answered by position. */
function reshuffled(q: QuizQuestion, random: () => number): QuizQuestion {
  const choices = shuffle(q.choices, random);
  return { ...q, choices, correct: choices.indexOf(q.choices[q.correct]) };
}

/**
 * One practice session: up to half from the cache (shown at once), the rest made from the topic's chunks a batch at a
 * time while the student answers. Each batch is Quiz me's generator on fresh chunks; only questions whose answer the
 * chunks back (`supportedBySource`) are shown. If making questions fails, the rest of the cache fills in.
 */
export function runPractice(opts: {
  cached: QuizQuestion[];
  /** A new random pick of the topic's chunks each call (pack-files `topicChunks`). */
  pickChunks: (limit: number) => Chunk[];
  onQuestion: (q: QuizQuestion) => void;
  /** Checked new questions, for the cache. */
  onFresh?: (questions: QuizQuestion[]) => void;
  onProgress?: (written: number) => void;
  random?: () => number;
}): PracticeRun {
  const random = opts.random ?? Math.random;
  let stopped = false;
  let current: QuizRun | null = null;

  const done = (async () => {
    const seen = new Set<string>();
    let count = 0;
    const show = (q: QuizQuestion) => {
      const key = q.question.trim().toLowerCase();
      if (count >= SESSION_SIZE || seen.has(key)) return false;
      seen.add(key);
      count++;
      opts.onQuestion(q);
      return true;
    };

    const pool = shuffle(opts.cached, random);
    for (const q of pool.splice(0, SESSION_SIZE / 2)) show(reshuffled(q, random));

    let empty = 0;
    while (count < SESSION_SIZE && empty < MAX_EMPTY_BATCHES && !stopped) {
      const chunks = opts.pickChunks(CHUNKS_PER_BATCH);
      if (!chunks.length) break;
      const source = chunks.map((c) => `${c.title}\n${c.text}`).join('\n\n');
      current = makeQuiz(source, opts.onProgress);
      const result = await current.done;
      if (stopped) break;
      if ('error' in result) {
        // No model or it won't load: retrying won't help; play what the cache gave.
        if (result.error !== 'invalid') {
          if (!count) return { error: result.error };
          break;
        }
        empty++;
        continue;
      }
      const checked = result.questions.filter((q) => supportedBySource(q, source));
      if (checked.length) opts.onFresh?.(checked);
      empty = checked.filter(show).length ? 0 : empty + 1;
    }

    for (const q of pool) show(reshuffled(q, random));
    if (!count) return { error: stopped ? ('stopped' as const) : ('invalid' as const) };
    return { total: count };
  })();

  return {
    stop: () => {
      stopped = true;
      current?.stop();
    },
    done,
  };
}
