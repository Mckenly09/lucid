// The model explains; the calculator computes (subjects.md "Tools"). Numbers-only build keeps the bundle small.
import { evaluate, format } from 'mathjs/number';

/** Characters allowed in an expression we check. No letters, so nothing but arithmetic reaches evaluate(). */
const ARITH_TAIL = /[\d.,\s+\-−*×·÷/^()π]+$/;
const NUMBER_HEAD = /^\s*(-?\d[\d,]*(?:\.\d+)?)(?!\s*[+\-−*×·÷/^\d])/;
const OPERATOR = /[+\-−*×·÷/^]/;

const normalize = (expr: string) =>
  expr
    .replace(/,(?=\d{3}\b)/g, '') // thousands separators
    .replace(/[−]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi');

/** The arithmetic at the end of `segment`, e.g. "17 − 5" from "Subtract: 17 − 5"; null if there's none. */
function tailExpression(segment: string) {
  const m = segment.match(ARITH_TAIL);
  if (!m) return null;
  // Glued to a word ("cos(0) + 1", "3x(2)") means the arithmetic isn't the whole expression.
  if (/^\S/.test(m[0]) && /\p{L}$/u.test(segment.slice(0, m.index))) return null;
  const tail = m[0].trim();
  // Must start like a number (not "+ 5" left over from "2x + 5") and actually compute something.
  if (!/^[\d(π]/.test(tail) || !OPERATOR.test(tail.slice(1))) return null;
  return tail;
}

function compute(expr: string): number | null {
  try {
    const v: unknown = evaluate(normalize(expr));
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Equal at the precision the model wrote: "3.33" matches 10/3, "153.94" matches 49π. */
function matches(value: number, written: string) {
  const decimals = written.split('.')[1]?.length ?? 0;
  const claimed = Number(written.replace(/,/g, ''));
  return Math.abs(value - claimed) <= 0.5 * 10 ** -decimals + 1e-9 * Math.abs(value);
}

/**
 * Finds "expression = number" (or ≈) in the answer, recomputes each expression and marks wrong results
 * with the calculator's value, e.g. "17 − 5 = 13 (calculator: 12)". Everything else is left as written.
 */
export function checkArithmetic(text: string) {
  let checked = 0;
  let wrong = 0;
  const lines = text.split('\n').map((line) => {
    const parts = line.split(/(=|≈)/);
    // parts: [segment, sep, segment, sep, segment…]; check each "segment sep segment" pair.
    for (let i = 2; i < parts.length; i += 2) {
      const expr = tailExpression(parts[i - 2]);
      const head = parts[i].match(NUMBER_HEAD);
      if (!expr || !head) continue;
      const value = compute(expr);
      if (value === null) continue;
      checked++;
      if (matches(value, head[1])) continue;
      wrong++;
      const at = head.index! + head[0].length;
      parts[i] = `${parts[i].slice(0, at)} (calculator: ${format(value, { precision: 10 })})${parts[i].slice(at)}`;
    }
    return parts.join('');
  });
  return { text: lines.join('\n'), checked, wrong };
}
