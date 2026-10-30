import { SUBJECTS } from './config';
import { COURSES, coursesFor } from './courses';

it('gives every course a unique id and a real subject other than General', () => {
  expect(new Set(COURSES.map((c) => c.id)).size).toBe(COURSES.length);
  for (const c of COURSES) {
    expect(SUBJECTS.some((s) => s.id === c.subject)).toBe(true);
    expect(c.subject).not.toBe('general');
  }
});

it('lists core courses always and electives only once picked', () => {
  expect(coursesFor('math', []).map((c) => c.id)).toEqual(['gen-math', 'stat-prob']);
  expect(coursesFor('math', ['business-finance', 'bio-1']).map((c) => c.id)).toEqual([
    'gen-math',
    'stat-prob',
    'business-finance',
  ]);
});
