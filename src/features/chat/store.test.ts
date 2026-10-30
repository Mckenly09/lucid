import { getChat, saveMessage, setChatSubject } from '@/db/chats';
import { findReferenceNotes } from '@/features/knowledge/retrieve';
import { installedModelPath } from '@/features/models/store';
import * as engine from '@/llm/engine';

import { useChat } from './store';

// Never load a real model in tests (AGENTS.md): the engine, model files and database are faked.
jest.mock('@/llm/engine', () => ({ isLoaded: jest.fn(), load: jest.fn(), generate: jest.fn() }));
jest.mock('@/features/models/store', () => ({ installedModelPath: jest.fn() }));
jest.mock('@/features/settings/store', () => ({ useSettings: { getState: () => ({ answerLanguage: 'same' }) } }));
jest.mock('@/db/chats', () => ({ saveMessage: jest.fn(), getChat: jest.fn(), setChatSubject: jest.fn() }));
jest.mock('@/features/knowledge/retrieve', () => ({ findReferenceNotes: jest.fn() }));

const mocked = jest.mocked(engine);

/** A fake answer that streams `tokens`, or stops early when stop() is called. */
function fakeAnswer(tokens: string[]) {
  mocked.generate.mockImplementation(({ onToken }) => {
    let stopped = false;
    const done = (async () => {
      let text = '';
      for (const t of tokens) {
        await Promise.resolve();
        if (stopped) break;
        onToken(t);
        text += t;
      }
      return text;
    })();
    return { stop: () => (stopped = true), done };
  });
}

const messages = (id: string) => useChat.getState().chats[id].messages;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(saveMessage).mockReset();
  useChat.setState({ chats: {}, activeId: null, status: 'idle', error: null });
  jest.mocked(installedModelPath).mockReturnValue('/doc/models/m.gguf');
  mocked.isLoaded.mockReturnValue(false);
  mocked.load.mockResolvedValue();
  jest.mocked(findReferenceNotes).mockReturnValue({ notes: [], sources: [] });
});

it('adds matching notes to the prompt and keeps their sources on the answer', async () => {
  jest.mocked(findReferenceNotes).mockReturnValue({ notes: ['Chlorophyll absorbs light.'], sources: ['Your notes · Bio'] });
  fakeAnswer(['Plants use light.']);
  const id = useChat.getState().newChat('u1', 'science');
  await useChat.getState().ask(id, 'Why do plants need sunlight?');

  expect(findReferenceNotes).toHaveBeenCalledWith('u1', 'science', 'Why do plants need sunlight?');
  const turns = mocked.generate.mock.calls[0][0].turns;
  const asked = turns[turns.length - 1].content;
  expect(asked.startsWith('Reference notes:')).toBe(true);
  expect(asked).toContain('Chlorophyll absorbs light.');
  expect(asked.endsWith('Question: Why do plants need sunlight?')).toBe(true);
  expect(turns.every((t) => Object.keys(t).sort().join() === 'content,role')).toBe(true);
  expect(messages(id)[1]).toEqual({ role: 'assistant', content: 'Plants use light.', sources: ['Your notes · Bio'] });
  expect(jest.mocked(saveMessage).mock.calls[1][4]).toEqual(['Your notes · Bio']);
});

it('loads the model, then streams the answer into the chat', async () => {
  fakeAnswer(['1 + 1 ', '= 2']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, ' 1 + 1 ');

  expect(mocked.load).toHaveBeenCalledWith('/doc/models/m.gguf');
  expect(mocked.generate.mock.calls[0][0].temperature).toBe(0.1); // math prompt
  expect(messages(id)).toEqual([
    { role: 'user', content: '1 + 1' },
    { role: 'assistant', content: '1 + 1 = 2' },
  ]);
  expect(useChat.getState()).toMatchObject({ status: 'idle', activeId: null, error: null });
  expect(jest.mocked(saveMessage).mock.calls.map((c) => [c[0], c[2], c[3]])).toEqual([
    ['u1', 'user', '1 + 1'],
    ['u1', 'assistant', '1 + 1 = 2'],
  ]);
});

it('opens a saved chat for its own account only', () => {
  jest.mocked(getChat).mockImplementation((uid, id) =>
    uid === 'u1' ? { id, subject: 'math', course: null, messages: [{ role: 'user', content: 'hi' }] } : null,
  );
  expect(useChat.getState().open('u2', 'c1')).toBe(false);
  expect(useChat.getState().open('u1', 'c1')).toBe(true);
  expect(messages('c1')).toEqual([{ role: 'user', content: 'hi' }]);
});

it('keeps the answer on screen when saving fails', async () => {
  jest.mocked(saveMessage).mockImplementation(() => {
    throw new Error('disk full');
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  fakeAnswer(['2']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, '1 + 1');
  expect(messages(id)[1]).toEqual({ role: 'assistant', content: '2' });
  expect(JSON.stringify(warn.mock.calls)).not.toContain('1 + 1'); // never log the question
  warn.mockRestore();
});

it('marks wrong arithmetic in math answers and saves the marked text', async () => {
  fakeAnswer(['1 + 1 ', '= 3']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, '1 + 1');
  expect(messages(id)[1].content).toBe('1 + 1 = 3 (calculator: 2)');
  expect(jest.mocked(saveMessage).mock.calls[1][3]).toBe('1 + 1 = 3 (calculator: 2)');
});

it('adds the solver answer when the model stops at a rearrangement (x = 5 - 2y)', async () => {
  fakeAnswer(['Answer: ', 'x = 5 - 2y']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, 'Solve 2x + y = 7 and x - y = 2');
  expect(messages(id)[1].content).toBe('Answer: x = 5 - 2y\n\nCalculator check: x = 3, y = 1');
  expect(jest.mocked(saveMessage).mock.calls[1][3]).toBe('Answer: x = 5 - 2y\n\nCalculator check: x = 3, y = 1');
});

it('adds nothing when the model states the solver values', async () => {
  fakeAnswer(['Answer: x = 3, y = 1']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, 'Solve 2x + y = 7 and x - y = 2');
  expect(messages(id)[1].content).toBe('Answer: x = 3, y = 1');
});

it('leaves non-calculator subjects as written', async () => {
  fakeAnswer(['1 + 1 = 3']);
  const id = useChat.getState().newChat('u1', 'english');
  await useChat.getState().ask(id, 'hi');
  expect(messages(id)[1].content).toBe('1 + 1 = 3');
});

it('Explain shows the chip label and sends only the last answer', async () => {
  fakeAnswer(['Plants make food.']);
  const id = useChat.getState().newChat('u1', 'science');
  await useChat.getState().ask(id, 'Why do plants need sunlight?');
  fakeAnswer(['Simpler.']);
  await useChat.getState().explain(id, 'simpler');

  expect(messages(id).slice(2)).toEqual([
    { role: 'user', content: 'Explain simpler' },
    { role: 'assistant', content: 'Simpler.' },
  ]);
  const { turns } = mocked.generate.mock.calls[1][0];
  expect(turns).toHaveLength(1);
  expect(turns[0].content).toContain('Plants make food.');
  expect(turns[0].content).not.toContain('Why do plants need sunlight?');
});

it('Retry after a failed explain re-sends the explain prompt, not the chip label', async () => {
  fakeAnswer(['x = 6']);
  mocked.isLoaded.mockReturnValue(true);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, 'Solve 2x + 5 = 17');
  mocked.generate.mockImplementationOnce(() => {
    throw new Error('boom');
  });
  await useChat.getState().explain(id, 'example');
  expect(useChat.getState().error?.kind).toBe('generate');

  fakeAnswer(['Example.']);
  useChat.getState().retry(id);
  await new Promise((r) => setTimeout(r, 0));
  const retried = mocked.generate.mock.calls[mocked.generate.mock.calls.length - 1][0];
  expect(retried.turns[0].content).toContain('x = 6');
  expect(retried.turns[0].content).not.toBe('Give an example');
});

it('Explain does nothing before there is an answer', async () => {
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().explain(id, 'simpler');
  expect(messages(id)).toEqual([]);
});

it('sends earlier messages as history for a follow-up', async () => {
  fakeAnswer(['ok']);
  const id = useChat.getState().newChat('u1', 'general');
  await useChat.getState().ask(id, 'first');
  await useChat.getState().ask(id, 'second');
  expect(mocked.generate.mock.calls[1][0].turns.map((t) => t.content)).toEqual(['first', 'ok', 'second']);
});

it('a changed subject applies to the next question and is saved', async () => {
  fakeAnswer(['ok']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, 'first');
  useChat.getState().setSubject(id, 'science');
  expect(jest.mocked(setChatSubject)).toHaveBeenCalledWith('u1', id, 'science');

  fakeAnswer(['ok']);
  await useChat.getState().ask(id, 'second');
  expect(mocked.generate.mock.calls[0][0].temperature).toBe(0.1); // math prompt for the first answer
  expect(mocked.generate.mock.calls[1][0].temperature).not.toBe(0.1);
  expect(useChat.getState().chats[id].messages[1].content).toBe('ok'); // the first answer is kept
});

it('shows an error and makes no model call when nothing is downloaded', async () => {
  jest.mocked(installedModelPath).mockReturnValue(null);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, 'hi');
  expect(useChat.getState().error).toEqual({ chatId: id, kind: 'no-model' });
  expect(mocked.load).not.toHaveBeenCalled();
});

it('Retry re-sends the question after a failed load', async () => {
  mocked.load.mockRejectedValueOnce(new Error('oom'));
  fakeAnswer(['2']);
  const id = useChat.getState().newChat('u1', 'math');
  await useChat.getState().ask(id, '1 + 1');
  expect(useChat.getState().error?.kind).toBe('load');

  useChat.getState().retry(id);
  await new Promise((r) => setTimeout(r, 0));
  expect(messages(id)).toEqual([
    { role: 'user', content: '1 + 1' },
    { role: 'assistant', content: '2' },
  ]);
  // The question was saved once, not again on Retry.
  expect(jest.mocked(saveMessage).mock.calls.filter((c) => c[2] === 'user')).toHaveLength(1);
});

it('Stop during loading cancels the answer', async () => {
  let finishLoad = () => {};
  mocked.load.mockReturnValue(new Promise<void>((r) => (finishLoad = r)));
  const id = useChat.getState().newChat('u1', 'math');
  const pending = useChat.getState().ask(id, 'hi');
  useChat.getState().stop();
  finishLoad();
  await pending;
  expect(mocked.generate).not.toHaveBeenCalled();
  expect(messages(id)).toEqual([{ role: 'user', content: 'hi' }]);
});

it('Stop before the first word leaves no empty answer bubble', async () => {
  fakeAnswer(['never']);
  mocked.isLoaded.mockReturnValue(true);
  const id = useChat.getState().newChat('u1', 'math');
  const pending = useChat.getState().ask(id, 'hi');
  useChat.getState().stop();
  await pending;
  expect(messages(id)).toEqual([{ role: 'user', content: 'hi' }]);
});

describe('speed', () => {
  it('warm-up loads the installed model once, and skips when loaded or not installed', () => {
    useChat.getState().warmUp();
    expect(mocked.load).toHaveBeenCalledWith('/doc/models/m.gguf');

    mocked.load.mockClear();
    mocked.isLoaded.mockReturnValue(true);
    useChat.getState().warmUp();
    jest.mocked(installedModelPath).mockReturnValue(null);
    useChat.getState().warmUp();
    expect(mocked.load).not.toHaveBeenCalled();
  });

  it('a failed warm-up stays silent', async () => {
    mocked.load.mockRejectedValue(new Error('no memory'));
    expect(() => useChat.getState().warmUp()).not.toThrow();
    await Promise.resolve();
  });

  it('streams tokens to the screen in batches, with the full text at the end', async () => {
    fakeAnswer(['The ', 'answer ', 'is ', 'six', '.']);
    const id = useChat.getState().newChat('u1', 'general');
    const shown: string[] = [];
    const unsubscribe = useChat.subscribe((s) => {
      const last = s.chats[id]?.messages.at(-1);
      if (last?.role === 'assistant' && last.content && last.content !== shown.at(-1)) shown.push(last.content);
    });
    await useChat.getState().ask(id, 'What is 2 x 3?');
    unsubscribe();

    expect(shown).toEqual(['The answer is six.']);
    expect(messages(id)[1].content).toBe('The answer is six.');
  });

  it('shows text while the answer is still being written', async () => {
    jest.useFakeTimers();
    let send: (t: string) => void = () => {};
    let finish: () => void = () => {};
    mocked.generate.mockImplementation(({ onToken }) => {
      send = onToken;
      return { stop: () => {}, done: new Promise<string>((resolve) => (finish = () => resolve('Halfway there'))) };
    });
    const id = useChat.getState().newChat('u1', 'general');
    const asking = useChat.getState().ask(id, 'Long question');
    await jest.advanceTimersByTimeAsync(0); // let the answer start

    send('Halfway ');
    expect(messages(id)[1].content).toBe(''); // held for the batch
    jest.advanceTimersByTime(50);
    expect(messages(id)[1].content).toBe('Halfway '); // on screen before the answer ends

    send('there');
    finish();
    await asking;
    expect(messages(id)[1].content).toBe('Halfway there');
    jest.useRealTimers();
  });
});
