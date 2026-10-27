import { modelFile, toPath } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import * as engine from '@/llm/engine';
import { modelById } from '@/llm/models';
import { buildQuizPrompt } from '@/llm/prompts';

import { parseQuiz, type QuizQuestion } from './services/parse';

export type QuizError = 'no-model' | 'load' | 'invalid' | 'stopped';
export type QuizRun = { stop: () => void; done: Promise<{ questions: QuizQuestion[] } | { error: QuizError }> };

/** Generates a quiz from one answer: two tries at valid JSON (roadmap v1), stoppable at any point. */
export function makeQuiz(answer: string): QuizRun {
  let stopped = false;
  let generation: engine.Generation | null = null;

  const done = (async () => {
    const installedId = useModels.getState().installedId;
    if (!installedId) return { error: 'no-model' as const };
    const path = toPath(modelFile(modelById(installedId)).uri);
    try {
      await engine.load(path);
    } catch {
      return { error: 'load' as const };
    }
    for (let attempt = 0; attempt < 2 && !stopped; attempt++) {
      try {
        generation = engine.generate({ ...buildQuizPrompt(answer), onToken: () => {} });
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
