import { countDueBetween, deleteCard, deleteDeck, listDecks, listDueCards, saveCard, saveReview } from './cards';
import { getDb } from './client';
import { testDb } from './test-db';

jest.mock('./client', () => ({ getDb: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const card = (subject: 'math' | 'science', front: string) => ({ subject, front, back: `${front}?` });

beforeEach(() => {
  jest.mocked(getDb).mockReturnValue(testDb());
});

it('makes new cards due right away, for their owner only', () => {
  saveCard('u1', card('math', '2 + 2'));
  saveCard('u2', card('math', 'not mine'));
  const due = listDueCards('u1', Date.now());
  expect(due).toHaveLength(1);
  expect(due[0]).toMatchObject({ subject: 'math', front: '2 + 2', back: '2 + 2?', chatId: null, reps: 0 });
});

it('moves a reviewed card to its next due date', () => {
  saveCard('u1', card('math', 'x'));
  const [c] = listDueCards('u1', Date.now());
  saveReview('u1', c.id, { ease: 2.6, intervalDays: 3, reps: 1, dueAt: Date.now() + 3 * DAY });
  expect(listDueCards('u1', Date.now())).toEqual([]);
  expect(listDueCards('u1', Date.now() + 4 * DAY)[0]).toMatchObject({ ease: 2.6, intervalDays: 3, reps: 1 });
});

it("never changes or deletes another student's card", () => {
  saveCard('u1', card('math', 'x'));
  const [c] = listDueCards('u1', Date.now());
  saveReview('u2', c.id, { ease: 1, intervalDays: 99, reps: 9, dueAt: 0 });
  deleteCard('u2', c.id);
  expect(listDueCards('u1', Date.now())[0]).toMatchObject({ id: c.id, reps: 0 });
});

it('counts decks per subject, biggest first, and deletes one deck', () => {
  saveCard('u1', card('science', 'a'));
  saveCard('u1', card('science', 'b'));
  saveCard('u1', card('math', 'c'));
  const now = Date.now();
  expect(listDecks('u1', now)).toEqual([
    { subject: 'science', total: 2, learned: 0, due: 2 },
    { subject: 'math', total: 1, learned: 0, due: 1 },
  ]);
  deleteDeck('u1', 'science');
  expect(listDecks('u1', now).map((d) => d.subject)).toEqual(['math']);
});

it('counts cards coming due in a window (the reminder count)', () => {
  saveCard('u1', card('math', 'now'));
  saveCard('u1', card('math', 'later'));
  const [, later] = listDueCards('u1', Date.now());
  saveReview('u1', later.id, { ease: 2.5, intervalDays: 2, reps: 1, dueAt: Date.now() + 2 * DAY });
  expect(countDueBetween('u1', 0, Date.now() + DAY)).toBe(1);
  expect(countDueBetween('u1', 0, Date.now() + 3 * DAY)).toBe(2);
  expect(countDueBetween('u2', 0, Date.now() + 3 * DAY)).toBe(0);
});
