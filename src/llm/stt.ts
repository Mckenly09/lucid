// Speech-to-text with nobodywho's built-in Whisper (ONNX). Lives in src/llm/ because only this folder imports the
// runtime (AGENTS.md LLM rule 1); src/features/voice/engine.ts is the voice feature's only caller.
import { SpeechToText } from 'react-native-nobodywho';

/** `auto` lets Whisper detect English, Filipino (`tl`) or Taglish. */
export type SttLanguage = 'auto' | 'en' | 'tl';

/** The voice pack is int8 ONNX (src/features/voice/packs.ts); nobodywho picks `*_int8.onnx` from the folder. */
const QUANTIZATION = 'int8';

const keyOf = (dir: string, language: SttLanguage) => `${dir}|${language}`;

let loaded: { key: string; stt: SpeechToText } | null = null;
let pending: { key: string; promise: Promise<SpeechToText> } | null = null;
// Bumped by every unload. A load that finishes after one (the student cancelled while Whisper was still loading)
// frees its model at once instead of leaving it in memory beside the AI model.
let generation = 0;

/**
 * Loads the Whisper folder at `dir` for `language`. Whisper's language is fixed when it loads, so a new language
 * reloads; the same one is instant. Concurrent calls share one load.
 */
export function loadStt(dir: string, language: SttLanguage): Promise<SpeechToText> {
  const key = keyOf(dir, language);
  if (loaded?.key === key) return Promise.resolve(loaded.stt);
  if (pending?.key === key) return pending.promise;
  unloadStt();
  const mine = generation;
  const promise = (async () => {
    const stt = await SpeechToText.load({
      source: dir,
      language: language === 'auto' ? undefined : language,
      quantization: QUANTIZATION,
    });
    if (mine !== generation) {
      stt.destroy();
      throw new Error('Speech-to-text was unloaded while loading');
    }
    loaded = { key, stt };
    return stt;
  })().finally(() => {
    if (pending?.key === key) pending = null;
  });
  pending = { key, promise };
  return promise;
}

/** Frees Whisper's memory, so it never sits beside the AI model longer than one question. */
export function unloadStt() {
  generation++;
  pending = null;
  const old = loaded;
  loaded = null;
  old?.stt.destroy();
}

/** The text spoken in 16-bit mono `pcm` (nobodywho resamples to Whisper's 16 kHz itself). Loads first if needed. */
export async function transcribePcm(pcm: Int16Array, sampleRate: number, dir: string, language: SttLanguage) {
  const stt = await loadStt(dir, language);
  return (await stt.transcribePcm(pcm, sampleRate).completed()).trim();
}
