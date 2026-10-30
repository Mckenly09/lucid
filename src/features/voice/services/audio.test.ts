import { joinPcm, level, MAX_MS, pcmFromBase64, shouldStop, SILENCE_MS, splitLive } from './audio';

const base64 = (samples: number[]) => btoa(String.fromCharCode(...samples.flatMap((s) => [s & 0xff, (s >> 8) & 0xff])));

it('reads little-endian signed 16-bit samples', () => {
  expect([...pcmFromBase64(base64([0, 1, -1, 32767, -32768]))]).toEqual([0, 1, -1, 32767, -32768]);
});

it('gives silence a level of 0 and a full-scale signal 1', () => {
  expect(level(new Int16Array(160))).toBe(0);
  expect(level(new Int16Array(0))).toBe(0);
  expect(level(new Int16Array(160).fill(-32768))).toBe(1);
});

it('joins chunks in order', () => {
  expect([...joinPcm([Int16Array.of(1, 2), Int16Array.of(), Int16Array.of(3)])]).toEqual([1, 2, 3]);
});

describe('stopping on its own', () => {
  it('waits through silence before the student speaks', () => {
    expect(shouldStop({ heardMs: 5_000, spoke: false, silentMs: 5_000 })).toBe(false);
  });
  it('stops after 2 s of silence once they have spoken', () => {
    expect(shouldStop({ heardMs: 4_000, spoke: true, silentMs: SILENCE_MS - 1 })).toBe(false);
    expect(shouldStop({ heardMs: 4_000, spoke: true, silentMs: SILENCE_MS })).toBe(true);
  });
  it('stops at 30 s however it is going', () => {
    expect(shouldStop({ heardMs: MAX_MS, spoke: false, silentMs: 0 })).toBe(true);
  });
});

it('keeps the last word apart while it may still change', () => {
  expect(splitLive(' What is photo ')).toEqual({ done: 'What is ', pending: 'photo' });
  expect(splitLive('Ano')).toEqual({ done: '', pending: 'Ano' });
  expect(splitLive('')).toEqual({ done: '', pending: '' });
});
