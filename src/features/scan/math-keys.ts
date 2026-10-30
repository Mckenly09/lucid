/** A math key: what it shows, what TalkBack says, and the text it puts around the cursor or selection. */
export type MathKey = {
  label: string;
  name: string;
  before: string;
  after?: string;
  /** After wrapping a selection, how many characters back from the end the cursor goes (the fraction's bottom). */
  back?: number;
};

// Plain-text math the model and mathjs already read (docs/subjects.md: x^2, sqrt(9), 3/4); × ÷ π are mapped by calculator.ts.
export const MATH_KEYS: MathKey[] = [
  // A stacked fraction as one unit: (top)/(bottom). Brackets matter: x-1/x+2 means something else.
  { label: 'a/b', name: 'Fraction', before: '(', after: ')/()', back: 1 },
  { label: '√', name: 'Square root', before: 'sqrt(', after: ')' },
  { label: 'x²', name: 'Squared', before: '^2' },
  { label: '^', name: 'Power', before: '^' },
  { label: '/', name: 'Fraction bar', before: '/' },
  { label: '( )', name: 'Brackets', before: '(', after: ')' },
  { label: 'π', name: 'Pi', before: 'π' },
  { label: '×', name: 'Times', before: '×' },
  { label: '÷', name: 'Divided by', before: '÷' },
];

/** Puts the key's text at the cursor. A pair like sqrt( ) wraps the selected text; a single key replaces it. */
export function insertKey(text: string, selection: { start: number; end: number }, key: MathKey) {
  const start = Math.min(selection.start, selection.end, text.length);
  const end = Math.min(Math.max(selection.start, selection.end), text.length);
  const picked = text.slice(start, end);
  const inserted = key.after ? key.before + picked + key.after : key.before;
  // Nothing selected inside a pair: land between the brackets so the student types straight in.
  const cursor = start + (key.after && !picked ? key.before.length : inserted.length - (picked ? (key.back ?? 0) : 0));
  return { text: text.slice(0, start) + inserted + text.slice(end), cursor };
}
