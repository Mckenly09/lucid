import { act, renderHook, waitFor } from '@testing-library/react-native';

import * as engine from '../engine';
import { SAMPLE_RATE } from '../services/audio';
import { useListening } from './use-listening';

// Never loads Whisper or opens the mic: the engine is a fake that hands the test the mic callback.
let micCallback: ((pcm: Int16Array) => void) | null = null;
jest.mock('../engine', () => ({
  load: jest.fn(async () => {}),
  unload: jest.fn(async () => {}),
  startMic: jest.fn((cb: (pcm: Int16Array) => void) => {
    micCallback = cb;
  }),
  stopMic: jest.fn(),
  transcribe: jest.fn(() => ({ stop: jest.fn(), done: Promise.resolve('Ano ang mitosis') })),
}));
jest.mock('../store', () => ({ installedVoicePath: () => '/doc/models/whisper-base' }));

/** `ms` of audio, loud (speech) or silent. */
const chunk = (ms: number, loud: boolean) => new Int16Array((SAMPLE_RATE * ms) / 1000).fill(loud ? 12_000 : 0);

const start = async (onDone = jest.fn()) => {
  // renderHook is async in @testing-library/react-native v14.
  const hook = await renderHook(() => useListening({ language: 'auto', onDone }));
  await waitFor(() => expect(hook.result.current.phase).toBe('listening'));
  return { ...hook, onDone };
};

beforeEach(() => {
  jest.clearAllMocks();
  micCallback = null;
});

it('Done sends the transcript and unloads Whisper', async () => {
  const { result, onDone } = await start();
  await act(async () => micCallback!(chunk(500, true)));
  await act(async () => result.current.finish());
  // finish() runs on after the tap (transcribe, then unload), so wait for its end.
  await waitFor(() => expect(onDone).toHaveBeenCalledWith('Ano ang mitosis'));
  expect(engine.unload).toHaveBeenCalled();
  expect(engine.stopMic).toHaveBeenCalled();
});

it('stops by itself after 2 s of silence once the student has spoken', async () => {
  const { onDone } = await start();
  await act(async () => micCallback!(chunk(500, true)));
  await act(async () => micCallback!(chunk(2_000, false)));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith('Ano ang mitosis'));
});

it('keeps listening through silence before anything is said', async () => {
  const { result, onDone } = await start();
  await act(async () => micCallback!(chunk(5_000, false)));
  expect(result.current.phase).toBe('listening');
  expect(onDone).not.toHaveBeenCalled();
});

it('Cancel drops the audio: nothing is transcribed or sent', async () => {
  const { result, onDone } = await start();
  await act(async () => micCallback!(chunk(500, true)));
  await act(async () => result.current.cancel());
  expect(onDone).not.toHaveBeenCalled();
  expect(engine.transcribe).not.toHaveBeenCalled();
  expect(engine.unload).toHaveBeenCalled();
});

it('closing the sheet mid-listen frees the mic and Whisper', async () => {
  const { unmount } = await start();
  await act(async () => unmount());
  expect(engine.stopMic).toHaveBeenCalled();
  expect(engine.unload).toHaveBeenCalled();
});

describe('Done reuses the live transcript when only silence came after it', () => {
  /** The live run's result, released by the test, so Done can land while it is still going. */
  function liveJob() {
    let release!: (text: string) => void;
    const done = new Promise<string>((r) => (release = r));
    jest.mocked(engine.transcribe).mockReturnValueOnce({ stop: jest.fn(), done });
    return release;
  }
  const liveStarted = () => waitFor(() => expect(engine.transcribe).toHaveBeenCalledTimes(1), { timeout: 3_000 });

  it('Done during a pause: waits for the running live text and sends it', async () => {
    const release = liveJob();
    const { result, onDone } = await start();
    await act(async () => micCallback!(chunk(500, true)));
    await liveStarted();
    // The mic keeps sending chunks: quiet ones while the student stops to think.
    await act(async () => micCallback!(chunk(750, false)));
    await act(async () => result.current.finish());
    release('Ano ang meiosis');
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Ano ang meiosis'));
    expect(engine.transcribe).toHaveBeenCalledTimes(1);
  });

  it('the 2 s silence stop reuses a live text that already finished', async () => {
    jest.mocked(engine.transcribe).mockReturnValueOnce({ stop: jest.fn(), done: Promise.resolve('Ano ang meiosis') });
    const { onDone } = await start();
    await act(async () => micCallback!(chunk(500, true)));
    await liveStarted();
    await act(async () => micCallback!(chunk(2_000, false)));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Ano ang meiosis'));
    expect(engine.transcribe).toHaveBeenCalledTimes(1);
  });

  it('transcribes again when the student kept talking after the live run started', async () => {
    const release = liveJob();
    const { result, onDone } = await start();
    await act(async () => micCallback!(chunk(500, true)));
    await liveStarted();
    await act(async () => micCallback!(chunk(500, true)));
    await act(async () => result.current.finish());
    release('Ano ang');
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Ano ang mitosis'));
    expect(engine.transcribe).toHaveBeenCalledTimes(2);
  });
});
