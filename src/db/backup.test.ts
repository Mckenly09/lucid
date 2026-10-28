import { insertBackupData } from './backup';
import { getDb } from './client';

jest.mock('./client', () => ({ getDb: jest.fn() }));

it('inserts parents before children, keys owned rows to the current uid, in one transaction', () => {
  const ran: unknown[][] = [];
  let inTransaction = false;
  jest.mocked(getDb).mockReturnValue({
    runSync: (...args: unknown[]) => ran.push([inTransaction, ...args]),
    withTransactionSync: (task: () => void) => {
      inTransaction = true;
      task();
      inTransaction = false;
    },
  } as unknown as ReturnType<typeof getDb>);

  insertBackupData('me', {
    chats: [{ id: 'n1', subject: 'math', title: 't', preview: '', created_at: 1, updated_at: 1 }],
    messages: [{ chat_id: 'n1', role: 'user', content: 'q', sources: null, created_at: 1 }],
    cards: [],
    quizResults: [],
    userPacks: [],
    userNotes: [],
  });

  expect(ran.every((r) => r[0] === true)).toBe(true);
  expect(ran[0][1]).toBe('INSERT INTO chats (id, subject, title, preview, created_at, updated_at, uid) VALUES (?, ?, ?, ?, ?, ?, ?)');
  expect(ran[0].slice(2)).toEqual(['n1', 'math', 't', '', 1, 1, 'me']);
  expect(ran[1][1]).toBe('INSERT INTO messages (chat_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?)');
  expect(ran[1]).not.toContain('me');
});
