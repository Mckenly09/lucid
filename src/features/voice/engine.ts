// The voice feature's only door to the microphone and to speech-to-text (v2.md §4). Whisper itself runs in
// src/llm/stt.ts, the one place that imports the runtime (AGENTS.md LLM rule 1).
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';

import type { VoiceLanguage } from '@/features/settings/store';
import { loadStt, transcribePcm, unloadStt } from '@/llm/stt';

import { pcmFromBase64, SAMPLE_RATE } from './services/audio';

/** Android's VOICE_RECOGNITION source: tuned for speech, no automatic gain games. */
const AUDIO_SOURCE = 6;
/** ~0.25 s per chunk at 16 kHz × 2 bytes: often enough for a lively waveform. */
const BUFFER_BYTES = 8_192;

let pack: string | null = null;
let mic: { remove: () => void } | null = null;

/** Loads the voice pack folder at `path` for `language`, so the first transcript doesn't wait for it. */
export async function load(path: string, language: VoiceLanguage) {
  pack = path;
  await loadStt(path, language);
}

/** Frees Whisper's memory; called after every listening session so it never sits beside the AI model. */
export async function unload() {
  unloadStt();
}

/** Streams the microphone into `onAudio`; audio stays in memory, nothing is written to disk. */
export function startMic(onAudio: (pcm: Int16Array) => void) {
  stopMic();
  LiveAudioStream.init({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    audioSource: AUDIO_SOURCE,
    bufferSize: BUFFER_BYTES,
    wavFile: '',
  });
  mic = LiveAudioStream.on('data', (base64) => onAudio(pcmFromBase64(base64)));
  LiveAudioStream.start();
}

export function stopMic() {
  if (!mic) return;
  mic.remove();
  mic = null;
  LiveAudioStream.stop();
}

export type Transcription = { stop: () => void; done: Promise<string> };

/**
 * Text spoken in `pcm` (16 kHz mono). Needs `load` first; a different language reloads Whisper on the way.
 * nobodywho can't cancel a running transcription, so `stop` only drops its result; callers run one at a time.
 */
export function transcribe(pcm: Int16Array, language: VoiceLanguage): Transcription {
  if (!pack) throw new Error('No voice pack loaded');
  let stopped = false;
  const done = transcribePcm(pcm.slice(), SAMPLE_RATE, pack, language).then((text) => (stopped ? '' : text));
  return { stop: () => (stopped = true), done };
}
