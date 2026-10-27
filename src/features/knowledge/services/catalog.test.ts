import { gradesLabel, packFileName, parseCatalog } from './catalog';

const good = {
  id: 'science-chem',
  name: 'Science · Chemistry',
  subject: 'science',
  grades: [7, 8, 9, 10],
  version: 1,
  sizeMB: 1.2,
  sha256: 'a'.repeat(64),
  url: 'https://raw.githubusercontent.com/Mckenly09/lucid-packs/main/packs/science-chem-v1.sqlite',
  license: 'CC BY-NC-SA 4.0',
  attribution: 'Adapted from Chemistry 2e (OpenStax)…',
};

it('accepts a well-formed catalog', () => {
  expect(parseCatalog({ packs: [good] })).toEqual([good]);
});

it('skips entries that could be unsafe or broken, keeping the good ones', () => {
  const bad = [
    { ...good, id: '../../evil' },
    { ...good, url: 'http://example.com/x.sqlite' },
    { ...good, url: 'https://raw.githubusercontent.com/someone-else/evil/main/x.sqlite' },
    { ...good, sha256: 'xyz' },
    { ...good, subject: 'cooking' },
    { ...good, sizeMB: 500 },
    { ...good, version: 0 },
    { ...good, license: '' },
    null,
  ];
  expect(parseCatalog({ packs: [...bad, good] })).toEqual([good]);
});

it('rejects something that is not a catalog', () => {
  expect(() => parseCatalog({ nope: true })).toThrow();
  expect(() => parseCatalog(null)).toThrow();
});

it('names files from id and version, and labels grades', () => {
  expect(packFileName(good)).toBe('science-chem-v1.sqlite');
  expect(gradesLabel([7, 8, 9, 10])).toBe('Grades 7–10');
  expect(gradesLabel([9])).toBe('Grade 9');
});
