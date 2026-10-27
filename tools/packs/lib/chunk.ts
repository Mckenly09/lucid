// Section paragraphs → 150–300-word chunks (docs/packs.md §3 "chunk"), so one search hit fits the ~400-token notes budget.
export const MIN_WORDS = 150;
export const MAX_WORDS = 300;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** A paragraph over the limit is cut at sentence ends. */
function splitLong(paragraph: string): string[] {
  if (words(paragraph) <= MAX_WORDS) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && words(cur + s) > MAX_WORDS) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Paragraphs joined greedily: close a chunk once it has MIN_WORDS and the next piece would pass MAX_WORDS. */
export function chunkParagraphs(paragraphs: string[]): string[] {
  const chunks: string[] = [];
  let cur: string[] = [];
  const count = () => words(cur.join(' '));
  for (const piece of paragraphs.flatMap(splitLong)) {
    // Close at MAX once the chunk has MIN words; close early only if waiting would pass MAX by more than 20%.
    const next = count() + words(piece);
    if (cur.length && next > MAX_WORDS && (count() >= MIN_WORDS || next > MAX_WORDS * 1.2)) {
      chunks.push(cur.join('\n'));
      cur = [];
    }
    cur.push(piece);
  }
  if (cur.length) {
    const last = cur.join('\n');
    // A short tail joins the chunk before it when that still stays near the limit.
    const prev = chunks[chunks.length - 1];
    if (prev && words(last) < MIN_WORDS && words(prev) + words(last) <= MAX_WORDS * 1.2) chunks[chunks.length - 1] = `${prev}\n${last}`;
    else chunks.push(last);
  }
  return chunks;
}

/**
 * A section under MIN_WORDS ("In this section, we will learn about…", a short summary) joins its neighbour in the
 * same module: the next one, or the one before if it's last. Keeps tiny, useless chunks out of search results.
 */
export function mergeShortSections<T extends { title: string; paragraphs: string[] }>(sections: T[]): T[] {
  const out: T[] = [];
  let carry: string[] = [];
  sections.forEach((s, i) => {
    const paragraphs = [...carry, ...s.paragraphs];
    carry = [];
    const isLast = i === sections.length - 1;
    if (words(paragraphs.join(' ')) < MIN_WORDS && !isLast) carry = paragraphs;
    else if (words(paragraphs.join(' ')) < MIN_WORDS && out.length) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { ...prev, paragraphs: [...prev.paragraphs, ...paragraphs] };
    } else out.push({ ...s, paragraphs });
  });
  return out;
}

/** OpenStax page slug: "1-2-phases-and-classification-of-matter", "1-introduction". */
export function openstaxSlug(chapter: number, section: number, title: string) {
  const name = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o') // Brønsted: ø has no decomposed form
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return section === 0 ? `${chapter}-introduction` : `${chapter}-${section}-${name}`;
}
