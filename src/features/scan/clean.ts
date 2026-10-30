import { isFilipino } from '@/llm/subjects/detect';

// "3.", "12)", "a)", "b.", "(iv)", "iv." at the very start, followed by a space ("3.5 m/s" is not numbering).
const NUMBERING = /^(?:\(?(?:\d{1,3}|[a-z]|[ivx]{1,5})[.)]|\((?:\d{1,3}|[a-z]|[ivx]{1,5})\))\s+/i;
// Multiple-choice options keep their own line: "a) 60 km/h", "B. 240 km/h".
const OPTION = /^\(?[a-d][.)]\s/i;

/** Turns OCR output into one editable question. Pure; `note` says what was removed, if anything. */
export function cleanScan(raw: string): { text: string; note?: string } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
  if (!lines.length) return { text: '' };

  const first = lines[0].match(NUMBERING);
  if (first && lines[0].length > first[0].length) lines[0] = lines[0].slice(first[0].length);

  // Filipino hyphens are real ("pang-uri", "mag-aaral"), so only English drops one at a line break ("veloc-" + "ity").
  const filipino = isFilipino(lines.join(' '));
  const text = lines.reduce((out, line) => {
    if (!out) return line;
    if (OPTION.test(line)) return `${out}\n${line}`;
    if (out.endsWith('-'))
      return (!filipino && /[a-z]-$/i.test(out) && /^[a-z]/.test(line) ? out.slice(0, -1) : out) + line;
    return `${out} ${line}`;
  }, '');

  return first ? { text, note: `Removed the number "${first[0].trim()}" from the start` } : { text };
}
