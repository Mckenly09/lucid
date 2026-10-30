import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceLanguage } from '@/features/settings/store';

import * as engine from '../engine';
import { durationMs, joinPcm, level, shouldStop, SPEECH_LEVEL } from '../services/audio';
import { installedVoicePath } from '../store';

export type ListeningPhase = 'loading' | 'listening' | 'paused' | 'finishing' | 'error';

/** Bars in the waveform (v2.md: 28). */
export const LEVELS = 28;
/** How often the live transcript catches up while the student talks. */
const LIVE_EVERY_MS = 1_500;

/**
 * One listening session: loads the voice pack, streams the mic, shows a live transcript, and calls `onDone` with the
 * final text (on Done, or by itself after 2 s of silence / 30 s). Audio lives only in memory and is dropped at the end;
 * Whisper (nobodywho, src/llm/stt.ts) is unloaded after, so it never sits beside the AI model.
 */
export function useListening({ language, onDone }: { language: VoiceLanguage; onDone: (text: string) => void }) {
  // No voice pack: straight to the error state (the sheet offers the download instead).
  const [phase, setPhase] = useState<ListeningPhase>(() => (installedVoicePath() ? 'loading' : 'error'));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [transcript, setTranscript] = useState('');

  const audio = useRef<Int16Array[]>([]);
  const heard = useRef({ ms: 0, spoke: false, silentMs: 0 });
  const live = useRef<engine.Transcription | null>(null);
  /** The newest finished live transcript: its text, how much audio it read, and in which language. */
  const last = useRef<{ text: string; samples: number; language: VoiceLanguage } | null>(null);
  const closed = useRef(false);
  const lang = useRef(language);
  const done = useRef(onDone);
  // Latest values for callbacks that outlive a render (the mic stream, timers).
  useEffect(() => {
    lang.current = language;
    done.current = onDone;
  });

  const stopLive = async () => {
    const job = live.current;
    live.current = null;
    job?.stop();
    await job?.done.catch(() => {});
  };

  const end = useCallback(async () => {
    engine.stopMic();
    await stopLive();
    audio.current = [];
    await engine.unload().catch(() => {});
  }, []);

  const finish = useCallback(async () => {
    if (closed.current) return;
    closed.current = true;
    engine.stopMic();
    setPhase('finishing');
    try {
      const pcm = joinPcm(audio.current);
      // nobodywho can't cancel a running live transcript, so Done waits for it either way; let it land in `last`.
      const running = live.current;
      live.current = null;
      await running?.done.catch(() => {});
      // The mic sends a chunk every 0.25 s, so there is always audio after the live run. If all of it was silence
      // (Done after a pause, or the 2 s silence stop) and the language is the same, the live text is the final one;
      // transcribing the same words again would double the wait.
      const l = last.current;
      const reuse = !!l && l.language === lang.current && durationMs(pcm.length - l.samples) <= heard.current.silentMs;
      const text = reuse ? l.text : pcm.length ? await engine.transcribe(pcm, lang.current).done : '';
      await end();
      done.current(text);
    } catch (e) {
      console.warn('Could not transcribe', e instanceof Error ? e.message : e);
      await end();
      setPhase('error');
    }
  }, [end]);

  const onAudio = useCallback(
    (pcm: Int16Array) => {
      if (closed.current) return;
      audio.current.push(pcm);
      const ms = durationMs(pcm.length);
      const lvl = level(pcm);
      const h = heard.current;
      h.ms += ms;
      if (lvl >= SPEECH_LEVEL) {
        h.spoke = true;
        h.silentMs = 0;
      } else h.silentMs += ms;
      setElapsedMs(h.ms);
      setLevels((l) => [...l, lvl].slice(-LEVELS));
      if (shouldStop({ heardMs: h.ms, spoke: h.spoke, silentMs: h.silentMs })) void finish();
    },
    [finish],
  );

  useEffect(() => {
    const path = installedVoicePath();
    if (!path) return;
    void engine
      .load(path, lang.current)
      .then(() => {
        if (closed.current) return;
        engine.startMic(onAudio);
        setPhase('listening');
      })
      .catch((e) => {
        console.warn('Could not load voice pack', e instanceof Error ? e.message : e);
        if (!closed.current) setPhase('error');
      });

    // Catch the live transcript up now and then; one run at a time so a slow phone doesn't queue them.
    const timer = setInterval(() => {
      const pcm = joinPcm(audio.current);
      if (closed.current || live.current || pcm.length === last.current?.samples || !heard.current.spoke) return;
      try {
        const language = lang.current;
        const job = engine.transcribe(pcm, language);
        live.current = job;
        void job.done
          .then((text) => {
            last.current = { text, samples: pcm.length, language };
            if (!closed.current) setTranscript(text);
          })
          .catch(() => {})
          .finally(() => {
            if (live.current === job) live.current = null;
          });
      } catch {
        // Not loaded yet; the next tick tries again.
      }
    }, LIVE_EVERY_MS);

    return () => {
      clearInterval(timer);
      if (closed.current) return;
      closed.current = true;
      void end();
    };
  }, [onAudio, end]);

  const pause = () => {
    if (phase !== 'listening') return;
    engine.stopMic();
    setPhase('paused');
  };

  const resume = () => {
    if (phase !== 'paused') return;
    // A pause isn't the silence that ends listening.
    heard.current.silentMs = 0;
    engine.startMic(onAudio);
    setPhase('listening');
  };

  /** Drops what was heard; nothing is sent. */
  const cancel = () => {
    if (closed.current) return;
    closed.current = true;
    void end();
  };

  return { phase, elapsedMs, levels, transcript, pause, resume, cancel, finish: () => void finish() };
}
