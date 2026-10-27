import type { Turn } from './engine';
import { buildExplainPrompt, buildPrompt, estimateTokens, HISTORY_TURNS, NOTES_MAX_CHARS, SHARED_RULES, systemPrompt } from './prompts';
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

  it('puts capped reference notes before the question', () => {
    const p = buildPrompt({ subjectId: 'social', question: 'Who?', notes: ['a'.repeat(5000)] });
    const content = p.turns[p.turns.length - 1].content;
    expect(content.startsWith('Reference notes:\n')).toBe(true);
    expect(content.endsWith('\n\nQuestion: Who?')).toBe(true);
    expect(content.length).toBeLessThan(NOTES_MAX_CHARS + 50);
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
