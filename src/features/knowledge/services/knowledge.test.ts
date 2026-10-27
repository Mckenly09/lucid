import { ftsQuery, pickNotes } from './search';
import { NOTE_MAX_WORDS, splitNotes } from './split-notes';

describe('ftsQuery', () => {
  it('quotes the meaningful words so the question cannot break FTS5 syntax', () => {
    expect(ftsQuery('Why do plants need sunlight?')).toBe('"plants" OR "need" OR "sunlight"');
    expect(ftsQuery('What is NEAR "AND" OR x*y -(z)')).toBe('"near"');
  });

  it('drops Filipino stop words and keeps Filipino content words', () => {
    expect(ftsQuery('Ano ang pang-uri?')).toBe('"pang" OR "uri"');
  });

  it('returns null when nothing is left to search for', () => {
    expect(ftsQuery('1 + 1 = ?')).toBeNull();
    expect(ftsQuery('')).toBeNull();
  });
});

describe('pickNotes', () => {
  it('fills the budget in rank order, cuts the last note, and lists each source once', () => {
    const hits = [
      { label: 'Your notes · Bio', text: 'a'.repeat(1000) },
      { label: 'Your notes · Bio', text: 'b'.repeat(1000) },
      { label: 'Science · Chemistry', text: 'c'.repeat(1000) },
    ];
    const { notes, sources } = pickNotes(hits, 1600);
    expect(notes.map((n) => n.length)).toEqual([1000, 601]);
    expect(notes[1].endsWith('…')).toBe(true);
    expect(sources).toEqual(['Your notes · Bio']);
  });
});

describe('splitNotes', () => {
  it('makes one note per markdown heading, titled by the heading', () => {
    const notes = splitNotes('Intro line.\n\n# Cells\nThe cell is the unit of life.\n\n## Mitosis ##\nOne cell becomes two.', 'bio.md');
    expect(notes).toEqual([
      { title: 'bio', text: 'Intro line.' },
      { title: 'Cells', text: 'The cell is the unit of life.' },
      { title: 'Mitosis', text: 'One cell becomes two.' },
    ]);
  });

  it('splits a long plain-text file at paragraphs', () => {
    const para = Array.from({ length: 120 }, () => 'word').join(' ');
    const notes = splitNotes([para, para, para].join('\r\n\r\n'), 'notes.txt');
    expect(notes.map((n) => n.title)).toEqual(['notes', 'notes (2)']);
    for (const n of notes) expect(n.text.split(/\s+/).length).toBeLessThanOrEqual(NOTE_MAX_WORDS);
  });

  it('ignores an empty file', () => {
    expect(splitNotes('  \n\n ', 'empty.txt')).toEqual([]);
  });
});
