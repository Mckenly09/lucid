import type { SubjectId } from '../config';
import math from './math.json';
import science from './science.json';

/** Each `mustInclude` item is a phrase, or a list of phrases where any one counts. */
export type EvalCase = { q: string; mustInclude: (string | string[])[]; mustNotInclude: string[] };

// shortcut: math and science only, as subjects.md asks first; add <subject>.json for the rest.
export const EVAL_SETS: Partial<Record<SubjectId, EvalCase[]>> = { math, science };

const SUPERSCRIPT: Record<string, string> = { '²': '^2', '³': '^3', '₂': '2', '₃': '3' };

/** Lowercase, no spaces or markdown, one spelling for minus/times/powers: "X² = 4" and "x^2=4" compare equal. */
export const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[²³₂₃]/g, (c) => SUPERSCRIPT[c])
    .replace(/\*\*|__|`/g, '') // bold and code marks; a single * stays, it's multiplication
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*');

/** Pass when every mustInclude item appears and no mustNotInclude phrase does. Returns what was missing. */
export function grade(answer: string, c: EvalCase) {
  const a = normalize(answer);
  const missing = c.mustInclude
    .map((item) => (Array.isArray(item) ? item : [item]))
    .filter((options) => !options.some((o) => a.includes(normalize(o))))
    .map((options) => options.join(' | '));
  const forbidden = c.mustNotInclude.filter((p) => a.includes(normalize(p)));
  return { pass: missing.length === 0 && forbidden.length === 0, missing, forbidden };
}
