import { saveMessage } from './chats';
import { getDb } from './client';
import { saveQuizResult } from './quiz';
import { testDb } from './test-db';

jest.mock('./client', () => ({ getDb: jest.fn() }));

it('saves a quiz score keyed by the student and linked to its chat', () => {
  jest.mocked(getDb).mockReturnValue(testDb());
  saveMessage('u1', { id: 'c1', subject: 'math' }, 'user', 'Solve 2x + 5 = 17');
  saveQuizResult('u1', { subject: 'math', chatId: 'c1', score: 2, total: 3 });
  expect(getDb().getAllSync('SELECT uid, subject, chat_id AS chatId, score, total FROM quiz_results')).toEqual([
    { uid: 'u1', subject: 'math', chatId: 'c1', score: 2, total: 3 },
  ]);
});
