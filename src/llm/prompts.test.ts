import type { Turn } from './engine';
import {
  buildExplainPrompt,
  buildPrompt,
  canQuiz,
  estimateTokens,
  HISTORY_ANSWER_MAX_CHARS,
  HISTORY_TURNS,
  NOTES_MAX_CHARS,
  SHARED_RULES,
  systemPrompt,
} from './prompts';
import { SUBJECTS } from './subjects/config';

describe('systemPrompt', () => {
  it.each(SUBJECTS.map((s) => s.id))('%s stays under ~250 tokens', (id) => {
    expect(estimateTokens(systemPrompt(id))).toBeLessThanOrEqual(250);
  });

  it('starts with the shared rules, including the honesty rule', () => {
    const p = systemPrompt('math');
    expect(p.startsWith(SHARED_RULES)).toBe(true);
    expect(p).toContain("I'm not sure");
    expect(p).toContain('Subject: Mathematics.');
  });
});

describe('buildPrompt', () => {
  it('sends the trimmed question as the last user turn with the subject temperature', () => {
    const p = buildPrompt({ subjectId: 'math', question: '  1 + 1  ' });
    expect(p.turns).toEqual([{ role: 'user', content: '1 + 1' }]);
    expect(p.temperature).toBe(0.1);
  });

  it('keeps only the last few history turns', () => {
    const history: Turn[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      content: `m${i}`,
    }));
    const p = buildPrompt({ subjectId: 'general', question: 'next', history });
    expect(p.turns).toHaveLength(HISTORY_TURNS + 1);
    expect(p.turns[0].content).toBe(`m${10 - HISTORY_TURNS}`);
  });

  it('shortens long past answers in history, never questions', () => {
    const long = 'x'.repeat(2000);
    const p = buildPrompt({
      subjectId: 'general',
      question: 'next',
      history: [
        { role: 'user', content: long },
        { role: 'assistant', content: long },
      ],
    });
    expect(p.turns[0].content).toBe(long);
    expect(p.turns[1].content).toBe(`${'x'.repeat(HISTORY_ANSWER_MAX_CHARS)}…`);
  });

  it('puts capped reference notes before the question', () => {
    const p = buildPrompt({ subjectId: 'social', question: 'Who?', notes: ['a'.repeat(5000)] });
    const content = p.turns[p.turns.length - 1].content;
    expect(content.startsWith('Reference notes:\n')).toBe(true);
    expect(content.endsWith('\n\nQuestion: Who?')).toBe(true);
    expect(content.length).toBeLessThan(NOTES_MAX_CHARS + 50);
  });

  it('gives math the solver steps for a system of equations, and other subjects nothing', () => {
    const question = 'Solve 2x + y = 7 and x - y = 2';
    const p = buildPrompt({ subjectId: 'math', question });
    const content = p.turns[p.turns.length - 1].content;
    expect(content).toMatch(/^Verified solution \(exact, from the calculator\):\n2x \+ y = 7\n/);
    expect(content).toContain('Final answer:\nx = 3, y = 1\n\nQuestion: Solve');
    expect(p.solution?.answer).toBe('x = 3, y = 1');
    expect(buildPrompt({ subjectId: 'english', question }).solution).toBeUndefined();
    expect(buildPrompt({ subjectId: 'math', question: 'Solve 2x + 5 = 17' }).solution).toBeUndefined();
  });
});

describe('buildExplainPrompt', () => {
  it.each(['simpler', 'example', 'filipino', 'english'] as const)(
    '%s sends only the last answer, in one user turn, with the subject system prompt',
    (kind) => {
      const p = buildExplainPrompt({ subjectId: 'science', kind, lastAnswer: ' Plants make food. ' });
      expect(p.system).toBe(systemPrompt('science'));
      expect(p.turns).toHaveLength(1);
      expect(p.turns[0].role).toBe('user');
      expect(p.turns[0].content).toContain('Plants make food.');
      expect(estimateTokens(p.system)).toBeLessThanOrEqual(250);
    },
  );

  it('asks for Filipino in Filipino', () => {
    const p = buildExplainPrompt({ subjectId: 'math', kind: 'filipino', lastAnswer: 'x = 6' });
    expect(p.turns[0].content).toContain('Ipaliwanag ito sa Filipino');
  });
});

it('adds the answer-language rule only when the student picked one', () => {
  expect(systemPrompt('math')).toBe(systemPrompt('math', 'same'));
  expect(buildPrompt({ subjectId: 'math', question: 'x', language: 'english' }).system).toMatch(/Always answer in English/);
  expect(estimateTokens(systemPrompt('filipino', 'filipino'))).toBeLessThan(250);
});

it('turns Quiz me off for answers under the word minimum', () => {
  expect(canQuiz('')).toBe(false);
  expect(canQuiz('Yes, that is right!')).toBe(false);
  expect(canQuiz(Array(40).fill('word').join(' '))).toBe(true);
});

it('names the senior high course in the system prompt, and ignores an unknown one', () => {
  const p = buildPrompt({ subjectId: 'science', course: 'chem-1', question: 'What is a mole?' });
  expect(p.system).toContain('Course: Chemistry 1.');
  expect(estimateTokens(p.system)).toBeLessThanOrEqual(250);
  expect(systemPrompt('science', 'same', 'nope')).toBe(systemPrompt('science'));
  expect(buildExplainPrompt({ subjectId: 'math', course: 'stat-prob', kind: 'simpler', lastAnswer: 'x' }).system).toContain(
    'Course: Statistics and Probability.',
  );
});
