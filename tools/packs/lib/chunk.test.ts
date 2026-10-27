import { chunkParagraphs, MAX_WORDS, mergeShortSections, MIN_WORDS, openstaxSlug } from './chunk.ts';

const para = (n: number, word = 'atom') => `${Array.from({ length: n }, () => word).join(' ')}.`;
const count = (s: string) => s.split(/\s+/).filter(Boolean).length;

it('joins short paragraphs until a chunk is 150–300 words', () => {
  const chunks = chunkParagraphs(Array.from({ length: 12 }, () => para(60)));
  expect(chunks.length).toBeGreaterThan(1);
  // Every chunk but the last reaches the minimum; the tail is shorter only when merging it would get too long.
  for (const c of chunks.slice(0, -1)) expect(count(c)).toBeGreaterThanOrEqual(MIN_WORDS);
  for (const c of chunks) expect(count(c)).toBeLessThanOrEqual(MAX_WORDS * 1.2);
  expect(chunks.join('\n').split('\n')).toHaveLength(12); // nothing lost or repeated
});

it('cuts a very long paragraph at sentence ends', () => {
  const long = Array.from({ length: 60 }, (_, i) => `Sentence ${i} has exactly seven words here.`).join(' ');
  const chunks = chunkParagraphs([long]);
  expect(chunks.length).toBeGreaterThan(1);
  for (const c of chunks) {
    expect(count(c)).toBeLessThanOrEqual(MAX_WORDS * 1.2);
    expect(c.endsWith('.')).toBe(true);
  }
});

it('keeps a short section as one chunk', () => {
  expect(chunkParagraphs(['Gases have no fixed shape.'])).toEqual(['Gases have no fixed shape.']);
});

it('builds OpenStax page slugs', () => {
  expect(openstaxSlug(1, 2, 'Phases and Classification of Matter')).toBe('1-2-phases-and-classification-of-matter');
  expect(openstaxSlug(14, 1, 'Brønsted-Lowry Acids and Bases')).toBe('14-1-bronsted-lowry-acids-and-bases');
  expect(openstaxSlug(3, 0, 'Introduction')).toBe('3-introduction');
});

it('merges a short section into the next one, or the previous one when it is last', () => {
  const merged = mergeShortSections([
    { title: 'Alcohols', paragraphs: ['In this section, we will learn about alcohols.'] },
    { title: 'Alcohols: Ethanol', paragraphs: [para(200)] },
    { title: 'Summary', paragraphs: ['Alcohols have an OH group.'] },
  ]);
  expect(merged.map((s) => s.title)).toEqual(['Alcohols: Ethanol']);
  expect(merged[0].paragraphs[0]).toBe('In this section, we will learn about alcohols.');
  expect(merged[0].paragraphs.at(-1)).toBe('Alcohols have an OH group.');
});

it('never makes a chunk much longer than the limit', () => {
  const chunks = chunkParagraphs([para(140), para(280)]);
  for (const c of chunks) expect(count(c)).toBeLessThanOrEqual(MAX_WORDS * 1.2);
});
