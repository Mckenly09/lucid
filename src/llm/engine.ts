// The only file that imports the LLM runtime (AGENTS.md "Rules for the LLM layer").
import { Chat, Model, SamplerPresets } from 'react-native-nobodywho';

/** Short context keeps RAM low and small models sharp; prompts trim history to fit. */
const CONTEXT_SIZE = 2048;
/** Caps a runaway answer; also bounds how long the phone works on one question. */
const MAX_TOKENS = 512;
/** Low temperature: students want steady, factual answers. */
const TEMPERATURE = 0.3;

export type Turn = { role: 'user'; content: string } | { role: 'assistant'; content: string };
export type Generation = {
  /** Safe to call any time, more than once, or after it finished. */
  stop: () => void;
  /** Resolves with the full text, including after Stop (with what was written so far). */
  done: Promise<string>;
};

let loaded: { path: string; model: Model; chat: Chat } | null = null;
let pending: { path: string; promise: Promise<void> } | null = null;
let current: Generation | null = null;

export const isLoaded = (path: string) => loaded?.path === path;

/** Loads the model at `path`, releasing any other first. Concurrent calls share one load. */
export function load(path: string): Promise<void> {
  if (loaded?.path === path) return Promise.resolve();
  if (pending?.path === path) return pending.promise;
  unload();
  const promise = (async () => {
    const model = await Model.load({ modelPath: path });
    const chat = new Chat({ model, contextSize: CONTEXT_SIZE, sampler: SamplerPresets.temperature(TEMPERATURE) });
    loaded = { path, model, chat };
  })().finally(() => {
    pending = null;
  });
  pending = { path, promise };
  return promise;
}

export function unload() {
  current?.stop();
  current = null;
  loaded?.chat.destroy();
  loaded?.model.destroy();
  loaded = null;
}

/**
 * Streams an answer to `turns` (oldest first, ending with the user's question).
 * Starting a new generation stops the one before it.
 */
export function generate(opts: {
  system: string;
  turns: Turn[];
  onToken: (token: string) => void;
  maxTokens?: number;
  /** Per subject (subjects.md): math low, languages a bit higher. */
  temperature?: number;
}): Generation {
  if (!loaded) throw new Error('No model loaded');
  current?.stop();
  const { chat } = loaded;
  const maxTokens = opts.maxTokens ?? MAX_TOKENS;

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    chat.stopGeneration();
  };

  const done = (async () => {
    // complete() replaces the chat's history, so every call stands alone.
    const stream = chat.complete([{ role: 'system', content: opts.system }, ...opts.turns], {
      sampler: SamplerPresets.temperature(opts.temperature ?? TEMPERATURE),
    });
    let text = '';
    let count = 0;
    for await (const token of stream) {
      if (stopped) break;
      text += token;
      opts.onToken(token);
      if (++count >= maxTokens) stop();
    }
    return text;
  })().finally(() => {
    if (current === generation) current = null;
  });

  const generation = { stop, done };
  current = generation;
  return generation;
}
