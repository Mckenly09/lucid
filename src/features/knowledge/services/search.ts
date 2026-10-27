// Shared by student packs and downloaded packs: both are FTS5 tables searched with the student's question.

// Common English and Filipino words that would match every note.
const STOP = new Set(
  (
    'the and for are but not you your with this that what when where which who whom why how was were has have had ' +
    'does did can could should would will from into about than then them they their there these those its our out ' +
    'ano ang mga ng sa na at ay ito iyan iyon para kung bakit paano saan sino kailan din rin lang naman nga po ba si'
  ).split(' '),
);
const MAX_TERMS = 8;

/**
 * The student's question as an FTS5 query: each meaningful word quoted (so punctuation and FTS operators in the
 * question can't break the query), joined with OR, best matches ranked first by bm25. Null when nothing is left.
 */
export function ftsQuery(question: string): string | null {
  const words = question
    .toLowerCase()
    .normalize('NFKC')
    .match(/[\p{L}\p{N}]+/gu);
  const terms = [...new Set((words ?? []).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, MAX_TERMS);
  return terms.length ? terms.map((t) => `"${t}"`).join(' OR ') : null;
}

/** Search hits → "Reference notes" within the prompt budget; the labels become the answer's source chips. */
export function pickNotes(hits: { label: string; text: string }[], maxChars: number) {
  const notes: string[] = [];
  const sources: string[] = [];
  let used = 0;
  for (const h of hits) {
    const room = maxChars - used;
    if (room < 200) break; // a sliver of a note helps less than it costs
    const text = h.text.length > room ? `${h.text.slice(0, room).trimEnd()}…` : h.text;
    notes.push(text);
    used += text.length;
    if (!sources.includes(h.label)) sources.push(h.label);
  }
  return { notes, sources };
}
