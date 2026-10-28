// Systems of two linear equations, solved exactly by elimination (subjects.md "Tools": the tool computes, the model explains).
// Small models rearrange instead of solving ("x = 5 - 2y"), so the numbers come from here, never from the model.

/** An exact fraction n/d, d > 0, in lowest terms. BigInt so school-size coefficients never round. */
type Frac = { n: bigint; d: bigint };

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
function frac(n: bigint, d = 1n): Frac {
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const ZERO = frac(0n);
const ONE = frac(1n);
const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
const neg = (a: Frac) => frac(-a.n, a.d);
const eq = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d;
const isZero = (a: Frac) => a.n === 0n;
const show = (a: Frac) => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);

/** "3", "0.5", "3/4" → exact fraction. */
function parseNumber(s: string): Frac {
  const [top, bottom] = s.split('/');
  const [whole, decimals = ''] = top.split('.');
  const n = frac(BigInt(whole + decimals), 10n ** BigInt(decimals.length));
  return bottom ? div(n, frac(BigInt(bottom))) : n;
}

const NUM = String.raw`\d+(?:\.\d+)?(?:\/\d+)?`;
// One Latin letter that isn't part of a word, so "Solve" or "cm" never count as variables.
const VAR = String.raw`(?<!\p{L})[a-z](?!\p{L})`;
// "2x" or "2 * x", never "12 x": a space alone (or a line break) between a number and a letter splits two equations.
const TERM = String.raw`(?:${NUM}(?:\s*\*\s*)?${VAR}|${NUM}|${VAR})`;
const EXPR = String.raw`[+\-]?\s*${TERM}(?:\s*[+\-]\s*${TERM})*`;
// A piece of the question is one whole equation with only words around it ("Solve 2x + y = 7", "x - y = 2."),
// so "x^2 + y = 3" or "2(x + y) = 10" never yield a partial match. Words are 2+ letters so a variable isn't taken as one.
const EQUATION = new RegExp(
  String.raw`^\s*(?:\p{L}{2,}[\s:]+)*(${EXPR})\s*=\s*(${EXPR})(?:[\s.?!:]+\p{L}{2,})*[\s.?!]*$`,
  'iu',
);
const SEPARATOR = /\n|[,;]|\s(?:and|at|tapos)\s/iu;
const TERM_PARTS = new RegExp(String.raw`([+\-]?)\s*(${NUM})?\s*\*?\s*([a-z])?`, 'giu');

/** Linear side → coefficient per variable plus a constant. */
function parseSide(side: string) {
  const coefs = new Map<string, Frac>();
  let constant = ZERO;
  for (const [, sign, num, name] of side.replace(/\s+/g, '').matchAll(TERM_PARTS)) {
    if (!num && !name) continue;
    const value = mul(num ? parseNumber(num) : ONE, sign === '-' ? neg(ONE) : ONE);
    if (name) coefs.set(name.toLowerCase(), add(coefs.get(name.toLowerCase()) ?? ZERO, value));
    else constant = add(constant, value);
  }
  return { coefs, constant };
}

/** a·v1 + b·v2 = c, everything moved so the variables are on the left. */
type Row = { coefs: [Frac, Frac]; c: Frac };

function term(coef: Frac, name: string | null, first: boolean) {
  const size = coef.n < 0n ? neg(coef) : coef;
  const sign = coef.n < 0n ? (first ? '-' : ' - ') : first ? '' : ' + ';
  const number = name && eq(size, ONE) ? '' : size.d === 1n || !name ? show(size) : `(${show(size)})`;
  return `${sign}${number}${name ?? ''}`;
}

/** "2x + y = 7"; zero terms are left out, and an empty left side reads "0". */
function showRow(parts: [Frac, string | null][], right: Frac) {
  const kept = parts.filter(([c]) => !isZero(c));
  const left = kept.map(([c, name], i) => term(c, name, i === 0)).join('') || '0';
  return `${left} = ${show(right)}`;
}

export type LinearSolution =
  | { kind: 'unique'; values: Record<string, string>; answer: string; steps: string }
  | { kind: 'none' | 'infinite'; answer: string; steps: string };

/**
 * Finds exactly two linear equations in two variables in `text` and solves them by elimination.
 * Null when the text has no such system or more than one (the model answers alone, as before).
 */
export function solveLinearSystem(text: string): LinearSolution | null {
  const normalized = text
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/,(?=\d{3}\b)/g, '') // thousands separators, so "1,000" isn't split into two pieces
    // Lead-in like "Solve for x and y:" or "Find x and y if": its lone letters would block the match.
    .replace(/^[^=]*(?::|\s(?:if|kung)\s)/i, '');
  // Exactly two "=" in the whole text, so no equation the parser can't read is silently left out.
  if (normalized.split('=').length !== 3) return null;
  const found = normalized
    .split(SEPARATOR)
    .map((piece) => piece.match(EQUATION))
    .filter((m) => m !== null)
    .map((m) => ({ text: `${m[1].trim()} = ${m[2].trim()}`.replace(/\s+/g, ' '), left: parseSide(m[1]), right: parseSide(m[2]) }))
    .filter((e) => e.left.coefs.size + e.right.coefs.size > 0);
  if (found.length !== 2) return null;

  const names: string[] = [];
  for (const e of found) for (const name of [...e.left.coefs.keys(), ...e.right.coefs.keys()]) if (!names.includes(name)) names.push(name);
  if (names.length !== 2) return null;
  const [p, q] = names;

  const rows: Row[] = found.map(({ left, right }) => {
    const coef = (name: string) => sub(left.coefs.get(name) ?? ZERO, right.coefs.get(name) ?? ZERO);
    return { coefs: [coef(p), coef(q)], c: sub(right.constant, left.constant) };
  });
  // A variable that cancels out of both equations can be anything; leave that case to the model.
  if (rows.every((r) => isZero(r.coefs[0])) || rows.every((r) => isZero(r.coefs[1]))) return null;

  const rowText = (r: Row) => showRow([[r.coefs[0], p], [r.coefs[1], q]], r.c);
  const lines = found.map((e) => e.text);
  if (rows.some((r, i) => rowText(r).replace(/\s/g, '') !== found[i].text.replace(/\s/g, ''))) {
    lines.push('', 'Move the variables to the left side and the numbers to the right:', ...rows.map(rowText));
  }

  // Eliminate the variable whose coefficients already match or cancel; otherwise multiply to make them match.
  const [r1, r2] = rows;
  const easy = (k: number) => isZero(r1.coefs[k]) || isZero(r2.coefs[k]) || eq(r1.coefs[k], r2.coefs[k]) || eq(r1.coefs[k], neg(r2.coefs[k]));
  const k = easy(1) || !easy(0) ? 1 : 0;
  const j = 1 - k;
  const [kept, gone] = [names[j], names[k]];
  let A: Frac;
  let C: Frac;
  if (isZero(r1.coefs[k]) || isZero(r2.coefs[k])) {
    const only = isZero(r1.coefs[k]) ? r1 : r2;
    lines.push('', `The ${only === r1 ? 'first' : 'second'} equation has only ${kept}:`);
    [A, C] = [only.coefs[j], only.c];
  } else if (eq(r1.coefs[k], neg(r2.coefs[k]))) {
    lines.push('', `Add the equations to eliminate ${gone}:`);
    [A, C] = [add(r1.coefs[j], r2.coefs[j]), add(r1.c, r2.c)];
  } else if (eq(r1.coefs[k], r2.coefs[k])) {
    lines.push('', `Subtract the second equation from the first to eliminate ${gone}:`);
    [A, C] = [sub(r1.coefs[j], r2.coefs[j]), sub(r1.c, r2.c)];
  } else {
    // Scale each row by the other's coefficient (made small and positive), so the coefficients of `gone` match.
    let [m1, m2] = [r2.coefs[k], r1.coefs[k]];
    if (m1.d === 1n && m2.d === 1n) {
      const g = frac(gcd(m1.n, m2.n));
      [m1, m2] = [div(m1, g), div(m2, g)];
    }
    if (m1.n < 0n) [m1, m2] = [neg(m1), neg(m2)];
    const scale = (r: Row, m: Frac): Row => ({ coefs: [mul(r.coefs[0], m), mul(r.coefs[1], m)], c: mul(r.c, m) });
    const [s1, s2] = [scale(r1, m1), scale(r2, m2)];
    lines.push('', `Multiply the first equation by ${show(m1)} and the second by ${show(m2)}:`, rowText(s1), rowText(s2));
    lines.push('', `Subtract the second equation from the first to eliminate ${gone}:`);
    [A, C] = [sub(s1.coefs[j], s2.coefs[j]), sub(s1.c, s2.c)];
  }
  lines.push(showRow([[A, kept]], C));

  if (isZero(A)) {
    const none = !isZero(C);
    lines.push(
      '',
      none
        ? `0 = ${show(C)} is never true, so no values of ${p} and ${q} work.`
        : `0 = 0 is always true: the two equations describe the same line.`,
      '',
      'Final answer:',
      none ? 'No solution.' : 'Infinitely many solutions.',
    );
    return { kind: none ? 'none' : 'infinite', answer: none ? 'No solution' : 'Infinitely many solutions', steps: lines.join('\n') };
  }

  const keptValue = div(C, A);
  if (!eq(A, ONE)) lines.push('', `Divide both sides by ${show(A)}:`, `${kept} = ${show(keptValue)}`);

  // Back-substitute into the simpler equation that still has the other variable.
  const size = (r: Row) => [...r.coefs, r.c].reduce((s, f) => s + Math.abs(Number(f.n)) + Number(f.d), 0);
  const back = [r1, r2].filter((r) => !isZero(r.coefs[k])).sort((a, b) => size(a) - size(b))[0];
  const known = mul(back.coefs[j], keptValue);
  const goneValue = div(sub(back.c, known), back.coefs[k]);
  lines.push('', `Substitute ${kept} = ${show(keptValue)} into ${rowText(back)}:`, showRow([[known, null], [back.coefs[k], gone]], back.c));
  if (!isZero(known)) lines.push(showRow([[back.coefs[k], gone]], sub(back.c, known)));
  if (!eq(back.coefs[k], ONE)) lines.push(`${gone} = ${show(goneValue)}`);

  const values = { [kept]: keptValue, [gone]: goneValue };
  // Exact check against every equation as the student wrote it; a failure here is a bug, so say nothing rather than mislead.
  if (!rows.every((r) => eq(add(mul(r.coefs[0], values[p]), mul(r.coefs[1], values[q])), r.c))) return null;

  const answer = `${p} = ${show(values[p])}, ${q} = ${show(values[q])}`;
  lines.push('', `Check: ${p} = ${show(values[p])} and ${q} = ${show(values[q])} make both equations true.`, '', 'Final answer:', answer);
  return { kind: 'unique', values: { [p]: show(values[p]), [q]: show(values[q]) }, answer, steps: lines.join('\n') };
}

/** True when the model's text states every solved value ("x = 3", "y=1"); used to add a calculator note when it doesn't. */
export function statesSolution(text: string, solution: LinearSolution) {
  if (solution.kind !== 'unique') return /no solution|infinite|walang solusyon/i.test(text);
  const t = text.replace(/[−–]/g, '-').replace(/\s+/g, '');
  return Object.entries(solution.values).every(([name, value]) =>
    // Not "2x=3": a digit or letter before the name means it's a coefficient, not the answer.
    new RegExp(`(?<![\\p{L}\\d])${name}=${value}(?![\\d./])`, 'iu').test(t),
  );
}
