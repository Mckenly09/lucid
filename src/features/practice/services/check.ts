import type { QuizQuestion } from '@/features/quiz/services/parse';
import { checkArithmetic } from '@/llm/subjects/calculator';

// Words that say nothing about whether a fact is in the source (English + Filipino).
const STOP = new Set(
  'the a an of and or to in on for with by is are was were be at as its it their this that from into than then ' +
    'ang ng mga sa ay na at si ni kay nang para mula ito iyan'.split(' '),
);

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
/**
 * Whole words only, so "ions" isn't found inside "solutions" or "no" inside "not". A short word must match exactly
 * (plain plural allowed: "ion"/"ions"); a longer one matches the start of a word on its stem ("alleles" → "allele").
 */
const matches = (answerWord: string, sourceWord: string) =>
  answerWord.length <= 5
    ? sourceWord === answerWord || sourceWord === `${answerWord}s` || `${sourceWord}s` === answerWord
    : sourceWord.startsWith(answerWord.slice(0, -2));
const NUMBER = /-?\d[\d,]*(?:\.\d+)?/g;
const numbers = (s: string) => (s.match(NUMBER) ?? []).map((n) => n.replace(/,/g, ''));

/** "What is 12 × 4?" + "48" → checks 12 × 4 = 48 with mathjs. True or false when it could check, null when it couldn't. */
function arithmetic(question: string, answer: string): boolean | null {
  const [value] = numbers(answer);
  if (value === undefined) return null;
  const { checked, wrong } = checkArithmetic(`${question.replace(/[?:]\s*$/, '')} = ${value}`);
  return checked ? wrong === 0 : null;
}

/**
 * Keeps a practice question only if the source backs its correct answer (v2.md §3: "simple keyword check"):
 * - wrong arithmetic in the question is always rejected (mathjs, never the model);
 * - every number in the answer is in the source, or the arithmetic checks out;
 * - at least two-thirds of the answer's real words (stems) are in the source: all of them for 1–2 word answers.
 */
export function supportedBySource(q: QuizQuestion, source: string): boolean {
  const answer = q.choices[q.correct] ?? '';
  const math = arithmetic(q.question, answer);
  if (math === false) return false;

  const sourceNumbers = new Set(numbers(source));
  const answerNumbers = numbers(answer);
  if (answerNumbers.length && math !== true && !answerNumbers.every((n) => sourceNumbers.has(n))) return false;

  const sourceWords = [...new Set(words(source))];
  const inSource = (w: string) => sourceWords.some((s) => matches(w, s));
  const content = words(answer).filter((w) => !STOP.has(w) && !/^\d/.test(w));
  // Only filler words (or only numbers, checked above): each word must still be in the source.
  if (!content.length) return answerNumbers.length > 0 || (words(answer).length > 0 && words(answer).every(inSource));
  const found = content.filter(inSource).length;
  return found * 3 >= content.length * 2;
}
