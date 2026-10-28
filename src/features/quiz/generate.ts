import { installedModelPath } from '@/features/models/store';
import * as engine from '@/llm/engine';
import { buildQuizPrompt, QUIZ_ANSWER_MAX_CHARS, QUIZ_ANSWER_MAX_TOKENS } from '@/llm/prompts';

import { parseQuiz, type QuizQuestion } from './services/parse';

export type QuizError = 'no-model' | 'load' | 'invalid' | 'stopped';
export type QuizRun = { stop: () => void; done: Promise<{ questions: QuizQuestion[] } | { error: QuizError }> };

/** Shortens a long answer until the quiz prompt fits the model's context; a cut-off quiz is invalid JSON. */
async function fit(answer: string) {
  let text = answer.trim().slice(0, QUIZ_ANSWER_MAX_CHARS);
  while ((await engine.countTokens(text)) > QUIZ_ANSWER_MAX_TOKENS) text = text.slice(0, Math.floor(text.length * 0.8));
  return text;
}

/**
 * Generates a quiz from one answer: two tries at valid JSON (roadmap v1), stoppable at any point.
 * `onProgress` gets the number of questions the model has started writing (for the loading screen).
 */
export function makeQuiz(answer: string, onProgress?: (written: number) => void): QuizRun {
  let stopped = false;
  let generation: engine.Generation | null = null;

  const done = (async () => {
    const path = installedModelPath();
    if (!path) return { error: 'no-model' as const };
    try {
      await engine.load(path);
    } catch {
      return { error: 'load' as const };
    }
    // If counting fails, the full answer still gets a try.
    const text = await fit(answer).catch(() => answer);
    for (let attempt = 0; attempt < 2 && !stopped; attempt++) {
      try {
        let json = '';
        onProgress?.(0);
        generation = engine.generate({
          ...buildQuizPrompt(text),
          onToken: (t) => {
            json += t;
            onProgress?.(json.split('"question"').length - 1);
          },
        });
        const questions = parseQuiz(await generation.done);
        if (questions) return { questions };
      } catch {
        // A failed generation counts as a bad try.
      }
    }
    return { error: stopped ? ('stopped' as const) : ('invalid' as const) };
  })();

  return {
    stop: () => {
      stopped = true;
      generation?.stop();
    },
    done,
  };
}
