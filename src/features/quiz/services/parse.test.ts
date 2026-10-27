import { parseQuiz } from './parse';

const q = (n: number, extra: object = {}) => ({
  question: `Question ${n}?`,
  answer: `right ${n}`,
  wrong: [`wrong ${n}a`, `wrong ${n}b`, `wrong ${n}c`],
  why: `Because ${n}.`,
  ...extra,
});
const json = (questions: unknown[]) => JSON.stringify({ questions });

it('builds 4 choices with exactly one correct answer, shuffled', () => {
  const quiz = parseQuiz(json([q(1), q(2), q(3)]), () => 0)!;
  expect(quiz).toHaveLength(3);
  for (const [i, item] of quiz.entries()) {
    expect(item.choices).toHaveLength(4);
    expect(item.choices[item.correct]).toBe(`right ${i + 1}`);
  }
  // random() = 0 moves the right answer off the first slot, so the order isn't the model's.
  expect(quiz[0].correct).not.toBe(0);
});

it('drops questions with a repeated or empty choice', () => {
  const quiz = parseQuiz(json([q(1), q(2), q(3), q(4, { wrong: ['RIGHT 4', 'x', 'y'] }), q(5, { question: ' ' })]))!;
  expect(quiz.map((x) => x.question)).toEqual(['Question 1?', 'Question 2?', 'Question 3?']);
});

it('keeps at most 5 questions', () => {
  expect(parseQuiz(json([1, 2, 3, 4, 5, 6].map((n) => q(n))))).toHaveLength(5);
});

it('fails on broken JSON, the wrong shape, or fewer than 3 good questions', () => {
  expect(parseQuiz('{"questions": [')).toBeNull();
  expect(parseQuiz('null')).toBeNull();
  expect(parseQuiz(json([q(1), q(2)]))).toBeNull();
  expect(parseQuiz(json([q(1), q(2), q(3, { wrong: ['a', 'b'] })]))).toBeNull();
});
