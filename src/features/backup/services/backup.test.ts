import { type BackupData, makeBackup, parseBackup, rekey } from './backup';

const data = (): BackupData => ({
  chats: [{ id: 'c1', subject: 'science', title: 'Plants', preview: 'They make food.', created_at: 1, updated_at: 2 }],
  messages: [
    { chat_id: 'c1', role: 'user', content: 'Why do plants need sunlight?', sources: null, created_at: 1 },
    { chat_id: 'c1', role: 'assistant', content: 'They make food.', sources: '["Science · Biology · Photosynthesis"]', created_at: 2 },
  ],
  cards: [
    {
      id: 'c1', // same id as the chat: ids are per table
      subject: 'science',
      front: 'Why sunlight?',
      back: 'Food',
      chat_id: 'c1',
      ease: 2.36,
      interval_days: 6,
      reps: 2,
      due_at: 10,
      created_at: 3,
      updated_at: 4,
    },
  ],
  quizResults: [{ subject: 'science', chat_id: 'c1', score: 2, total: 3, created_at: 5 }],
  userPacks: [{ id: 'p1', name: 'Bio', subject: 'science', created_at: 6, updated_at: 7 }],
  userNotes: [{ pack_id: 'p1', title: 'Cells', text: 'Cells are small.', created_at: 6, updated_at: 7 }],
});

const file = (d: unknown) => JSON.stringify({ app: 'lucid', version: 1, exportedAt: 9, data: d });

it('round-trips an export, review state included', () => {
  expect(parseBackup(JSON.stringify(makeBackup(data(), 9)))).toEqual(data());
});

it('accepts any length the app can save, like a pasted 60,000-character passage', () => {
  const d = data();
  const long = { ...d, messages: [{ ...d.messages[0], content: 'a'.repeat(60_000) }] };
  expect(parseBackup(file(long))?.messages[0].content).toHaveLength(60_000);
});

it('drops unknown fields such as a uid from another account', () => {
  const d = data();
  const withUid = { ...d, chats: [{ ...d.chats[0], uid: 'someone-else' }] };
  expect(parseBackup(file(withUid))?.chats[0]).not.toHaveProperty('uid');
});

it.each([
  ['not JSON', '{'],
  ['another app', JSON.stringify({ app: 'other', version: 1, data: data() })],
  ['a newer version', JSON.stringify({ app: 'lucid', version: 2, data: data() })],
  ['a missing table', file({ ...data(), cards: undefined })],
  ['an unknown subject', file({ ...data(), userPacks: [{ ...data().userPacks[0], subject: 'history' }] })],
  ['a bad role', file({ ...data(), messages: [{ ...data().messages[0], role: 'system' }] })],
  ['a number as text', file({ ...data(), cards: [{ ...data().cards[0], reps: '2' }] })],
  ['broken sources', file({ ...data(), messages: [{ ...data().messages[1], sources: '[1]' }] })],
  ['a message without its chat', file({ ...data(), chats: [] })],
  ['a note without its pack', file({ ...data(), userPacks: [] })],
  ['duplicate chat ids', file({ ...data(), chats: [data().chats[0], data().chats[0]] })],
])('rejects %s', (_, json) => {
  expect(parseBackup(json)).toBeNull();
});

it('gives everything new ids and keeps the links between rows', () => {
  let n = 0;
  const out = rekey(data(), () => `new-${++n}`);
  const chatId = out.chats[0].id;
  expect(chatId).not.toBe('c1');
  expect(out.messages.every((m) => m.chat_id === chatId)).toBe(true);
  expect(out.cards[0].id).not.toBe(chatId);
  expect(out.cards[0].chat_id).toBe(chatId);
  expect(out.quizResults[0].chat_id).toBe(chatId);
  expect(out.userNotes[0].pack_id).toBe(out.userPacks[0].id);
  expect(new Set([chatId, out.cards[0].id, out.userPacks[0].id]).size).toBe(3);
});
