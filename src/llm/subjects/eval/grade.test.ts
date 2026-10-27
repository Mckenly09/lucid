import { EVAL_SETS, grade, normalize } from './grade';

describe('normalize', () => {
  it('ignores spacing, case, bold and symbol variants', () => {
    expect(normalize('**X = 6**')).toBe('x=6');
    expect(normalize('x² + x − 6')).toBe('x^2+x-6');
    expect(normalize('F = m × a')).toBe('f=m*a');
    expect(normalize('H₂O')).toBe('h2o');
  });
});

describe('grade', () => {
  const c = { q: 'Why do plants need sunlight?', mustInclude: ['photosynthesis', ['food', 'glucose']], mustNotInclude: ['moonlight'] };

  it('passes when every item (or one of its options) appears', () => {
    expect(grade('Through **photosynthesis** plants make glucose.', c)).toEqual({ pass: true, missing: [], forbidden: [] });
  });

  it('reports what is missing', () => {
    expect(grade('They just like it.', c)).toMatchObject({ pass: false, missing: ['photosynthesis', 'food | glucose'] });
  });

  it('fails on a forbidden phrase', () => {
    expect(grade('Photosynthesis makes food using moonlight', c)).toMatchObject({ pass: false, forbidden: ['moonlight'] });
  });

  it('accepts a model-style answer for a math case', () => {
    const solve = EVAL_SETS.math!.find((x) => x.q === 'Solve 2x + 5 = 17')!;
    expect(grade('Steps:\n2x = 12\n\nAnswer: **x = 6**', solve).pass).toBe(true);
  });
});

describe('eval sets', () => {
  it.each(Object.entries(EVAL_SETS))('%s has 20–30 well-formed questions', (_, cases) => {
    expect(cases!.length).toBeGreaterThanOrEqual(20);
    expect(cases!.length).toBeLessThanOrEqual(30);
    for (const x of cases!) {
      expect(x.q.trim()).not.toBe('');
      expect(x.mustInclude.length).toBeGreaterThan(0);
    }
    expect(new Set(cases!.map((x) => x.q)).size).toBe(cases!.length); // no duplicates
  });
});
