import { getDb } from './client';
import { cachedQuestions, cacheQuestions, savePracticeSession, topicStats } from './practice';
import { testDb } from './test-db';

jest.mock('./client', () => ({ getDb: jest.fn() }));

const q = (question: string) => ({ question, choices: ['a', 'b', 'c', 'd'], correct: 0, why: '' });
const session = (topic: string, score: number, total = 10) => ({
  subject: 'science' as const,
  grade: 9,
  topic,
  score,
  total,
});

beforeEach(() => {
  jest.mocked(getDb).mockReturnValue(testDb());
  let now = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => (now += 1));
});

describe('topicStats', () => {
  it('gives the last score, the one before, and mastery over the last 3 sessions', () => {
    for (const s of [2, 4, 6, 8]) savePracticeSession('u1', session('sci9-volcanoes', s));
    expect(topicStats('u1', 'science', 9)).toEqual({
      'sci9-volcanoes': { last: { score: 8, total: 10 }, previous: 6, mastery: 0.6 },
    });
  });

  it('works after one session and keeps students, subjects and grades apart', () => {
    savePracticeSession('u1', session('sci9-bonding', 7));
    savePracticeSession('u2', session('sci9-bonding', 1));
    savePracticeSession('u1', { ...session('sci9-bonding', 1), grade: 10 });
    expect(topicStats('u1', 'science', 9)).toEqual({
      'sci9-bonding': { last: { score: 7, total: 10 }, previous: undefined, mastery: 0.7 },
    });
    expect(topicStats('u1', 'math', 9)).toEqual({});
  });

  it('uses each session’s own total (a short session of 8)', () => {
    savePracticeSession('u1', session('sci9-mole', 4, 8));
    expect(topicStats('u1', 'science', 9)['sci9-mole'].mastery).toBe(0.5);
  });
});

describe('question cache', () => {
  it('returns what was cached for the same pack versions only', () => {
    cacheQuestions('sci9-mole', 'science-chem@1', [q('What is a mole?')]);
    expect(cachedQuestions('sci9-mole', 'science-chem@1')).toEqual([q('What is a mole?')]);
    expect(cachedQuestions('sci9-mole', 'science-chem@2')).toEqual([]);
  });

  it('drops questions from an older pack version when new ones are saved', () => {
    cacheQuestions('sci9-mole', 'science-chem@1', [q('Old')]);
    cacheQuestions('sci9-mole', 'science-chem@2', [q('New')]);
    expect(getDb().getAllSync('SELECT json FROM practice_questions')).toHaveLength(1);
  });

  it('keeps only the newest 40 per topic', () => {
    cacheQuestions(
      't',
      'p@1',
      Array.from({ length: 30 }, (_, i) => q(`a${i}`)),
    );
    cacheQuestions(
      't',
      'p@1',
      Array.from({ length: 30 }, (_, i) => q(`b${i}`)),
    );
    const kept = cachedQuestions('t', 'p@1').map((x) => x.question);
    expect(kept).toHaveLength(40);
    expect(kept.filter((x) => x.startsWith('b'))).toHaveLength(30);
  });
});
