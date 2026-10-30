// Microphone audio: 16 kHz mono signed 16-bit PCM, what nobodywho's transcribePcm takes (src/llm/stt.ts).
export const SAMPLE_RATE = 16_000;
/** v2.md §4: stop on its own after 2 s of silence (once the student has spoken) or 30 s in all. */
export const SILENCE_MS = 2_000;
export const MAX_MS = 30_000;
/** Below this level counts as silence. A quiet room sits near 0.02; speech at arm's length is 0.1+. */
export const SPEECH_LEVEL = 0.06;

/** One mic chunk (base64 from the native stream) as samples. */
export function pcmFromBase64(base64: string): Int16Array {
  const bytes = atob(base64);
  const out = new Int16Array(bytes.length >> 1);
  for (let i = 0; i < out.length; i++) {
    const v = bytes.charCodeAt(2 * i) | (bytes.charCodeAt(2 * i + 1) << 8);
    out[i] = v >= 0x8000 ? v - 0x10000 : v;
  }
  return out;
}

/** Loudness 0–1 (RMS, square-rooted so normal speech fills the waveform instead of hugging the floor). */
export function level(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let sum = 0;
  for (const s of pcm) sum += s * s;
  return Math.min(1, Math.sqrt(Math.sqrt(sum / pcm.length) / 32768));
}

export function joinPcm(chunks: Int16Array[]): Int16Array {
  const out = new Int16Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export const durationMs = (samples: number) => (samples / SAMPLE_RATE) * 1000;

/** Whether listening should end on its own: too long, or quiet for a while after speech. */
export function shouldStop({ heardMs, spoke, silentMs }: { heardMs: number; spoke: boolean; silentMs: number }) {
  return heardMs >= MAX_MS || (spoke && silentMs >= SILENCE_MS);
}

/** Splits a live transcript into words already settled and the last one, which may still change. */
export function splitLive(text: string): { done: string; pending: string } {
  const t = text.trim();
  const cut = t.lastIndexOf(' ');
  return cut < 0 ? { done: '', pending: t } : { done: t.slice(0, cut + 1), pending: t.slice(cut + 1) };
}
