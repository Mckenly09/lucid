import { getDb } from './client';
import { deleteUserData, moveUserData } from './user-data';

jest.mock('./client', () => ({ getDb: jest.fn() }));

function fakeDb() {
  const ran: unknown[][] = [];
  jest.mocked(getDb).mockReturnValue({
    runSync: (...args: unknown[]) => ran.push(args),
    withTransactionSync: (task: () => void) => task(),
  } as unknown as ReturnType<typeof getDb>);
  return ran;
}

it('deletes every uid-keyed table for that account only', () => {
  const ran = fakeDb();
  deleteUserData('u1');
  expect(ran.map((r) => r[0])).toEqual([
    'DELETE FROM quiz_results WHERE uid = ?',
    'DELETE FROM cards WHERE uid = ?',
    'DELETE FROM chats WHERE uid = ?',
    'DELETE FROM user_packs WHERE uid = ?',
  ]);
  expect(ran.every((r) => r[1] === 'u1')).toBe(true);
});

it('moves an offline profile to the Google uid', () => {
  const ran = fakeDb();
  moveUserData('local-1', 'g1');
  expect(ran).toContainEqual(['UPDATE cards SET uid = ? WHERE uid = ?', 'g1', 'local-1']);
  expect(ran).toHaveLength(4);
});
