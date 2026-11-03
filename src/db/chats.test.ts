import { listDueCards, saveCard } from './cards';
import { deleteChat, findAnsweredChat, getChat, listChats, saveMessage, setChatSubject } from './chats';
import { getDb } from './client';
import { testDb } from './test-db';

jest.mock('./client', () => ({ getDb: jest.fn() }));

const chat = { id: 'c1', subject: 'science' as const };

beforeEach(() => {
  jest.mocked(getDb).mockReturnValue(testDb());
});

it('creates the chat with its first message and reads messages back in order, with sources', () => {
  saveMessage('u1', chat, 'user', 'Why do plants need sunlight?');
  saveMessage('u1', chat, 'assistant', 'For photosynthesis.', ['Science · Biology']);
  expect(getChat('u1', 'c1')).toEqual({
    id: 'c1',
    subject: 'science',
    course: null,
    messages: [
      { role: 'user', content: 'Why do plants need sunlight?' },
      { role: 'assistant', content: 'For photosynthesis.', sources: ['Science · Biology'] },
    ],
  });
});

it('titles the chat with the question and previews the first answer only', () => {
  saveMessage('u1', chat, 'user', 'Why do plants need sunlight?');
  saveMessage('u1', chat, 'assistant', 'For   photosynthesis.\nThey make food.');
  saveMessage('u1', chat, 'user', 'Explain simpler');
  saveMessage('u1', chat, 'assistant', 'A second answer.');
  expect(listChats('u1')[0]).toMatchObject({
    title: 'Why do plants need sunlight?',
    preview: 'For photosynthesis. They make food.',
  });
});

it("finds an answered chat by its question, never an unanswered one or another student's", () => {
  saveMessage('u1', chat, 'user', 'Why do plants need sunlight?');
  expect(findAnsweredChat('u1', 'Why do plants need sunlight?')).toBeNull();
  saveMessage('u1', chat, 'assistant', 'For photosynthesis.');
  expect(findAnsweredChat('u1', 'Why do plants need sunlight?')).toBe('c1');
  expect(findAnsweredChat('u1', '  why do plants need SUNLIGHT? ')).toBe('c1');
  expect(findAnsweredChat('u2', 'Why do plants need sunlight?')).toBeNull();
  expect(findAnsweredChat('u1', 'Something else')).toBeNull();
});

it('tells apart long questions that only differ after the title is cut off', () => {
  const start = 'A train leaves the station at 60 km/h and another train leaves the same station two hours later at 90 km/h. ';
  saveMessage('u1', chat, 'user', `${start}How far from the station after 3 hours?`);
  saveMessage('u1', chat, 'assistant', 'Answer for 3 hours.');
  expect(findAnsweredChat('u1', `${start}How far from the station after 3 hours?`)).toBe('c1');
  expect(findAnsweredChat('u1', `${start}How far from the station after 5 hours?`)).toBeNull();
});

it("keeps each student's chats apart", () => {
  saveMessage('u1', chat, 'user', 'mine');
  expect(getChat('u2', 'c1')).toBeNull();
  expect(listChats('u2')).toEqual([]);
  deleteChat('u2', 'c1');
  setChatSubject('u2', 'c1', 'math');
  expect(getChat('u1', 'c1')?.subject).toBe('science');
});

it('searches question and preview, treating % and _ as plain text', () => {
  saveMessage('u1', { id: 'a', subject: 'math' }, 'user', 'What is 50% of 80?');
  saveMessage('u1', { id: 'b', subject: 'math' }, 'user', 'Solve 2x + 5 = 17');
  saveMessage('u1', { id: 'b', subject: 'math' }, 'assistant', 'x = 6');
  expect(listChats('u1', '50%').map((c) => c.id)).toEqual(['a']);
  expect(listChats('u1', 'x = 6').map((c) => c.id)).toEqual(['b']);
  expect(listChats('u1', '%')).toHaveLength(1);
  expect(listChats('u1', '_')).toHaveLength(0);
});

it('deletes a chat with its messages and keeps its cards, unlinked', () => {
  saveMessage('u1', chat, 'user', 'q');
  saveCard('u1', { subject: 'science', front: 'q', back: 'a', chatId: 'c1' });
  deleteChat('u1', 'c1');
  expect(getChat('u1', 'c1')).toBeNull();
  expect(getDb().getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM messages')?.n).toBe(0);
  expect(listDueCards('u1', Date.now())[0].chatId).toBeNull();
});

it('keeps the chat course until the subject changes', () => {
  saveMessage('u1', { ...chat, course: 'bio-1' }, 'user', 'What is a cell?');
  expect(getChat('u1', 'c1')?.course).toBe('bio-1');
  setChatSubject('u1', 'c1', 'math');
  expect(getChat('u1', 'c1')).toMatchObject({ subject: 'math', course: null });
});
