// Calculator keys and evaluation, offline with mathjs (the same numbers-only build as the answer checker).
import { evaluate, format } from 'mathjs/number';

export type CalcState = {
  /** What the student typed, as shown: "√(3² + 4²)". */
  expr: string;
  /** Set after "=", until the next key. */
  result: string | null;
  /** The previous "expression = result", shown above. */
  history: string | null;
  /** The last result, for the Ans key. */
  ans: string | null;
  error: boolean;
};

export const EMPTY: CalcState = { expr: '', result: null, history: null, ans: null, error: false };

export type CalcKey =
  | { type: 'insert'; text: string }
  | { type: 'operator'; text: '+' | '−' | '×' | '÷' | '^' | '%' | '²' }
  | { type: 'paren' }
  | { type: 'clear' }
  | { type: 'delete' }
  | { type: 'equals' };

/** Tokens removed as one by delete, so "sin(" never becomes "si". */
const LAST_TOKEN = / [+−×÷] $|(?:sin|cos|tan|log|ln|√)\($|Ans$|[\s\S]$/;

const count = (s: string, ch: string) => s.split(ch).length - 1;

function normalize(expr: string, ans: string | null) {
  if (expr.includes('Ans') && ans === null) return null;
  const open = count(expr, '(') - count(expr, ')');
  return (expr + ')'.repeat(Math.max(0, open)))
    .replace(/Ans/g, `(${ans})`)
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/%/g, '/100')
    .replace(/log\(/g, 'log10(')
    .replace(/ln\(/g, 'log(');
}

const toRadians = (x: number) => (x * Math.PI) / 180;
/** The angle in [0, 360), so the exact school angles can be caught before floating-point π blurs them. */
const turn = (x: number) => ((x % 360) + 360) % 360;
const DEGREES = {
  sin: (x: number) => (turn(x) % 180 === 0 ? 0 : Math.sin(toRadians(x))),
  cos: (x: number) => (turn(x) % 180 === 90 ? 0 : Math.cos(toRadians(x))),
  // tan 90° and 270° have no value; NaN shows "Can't calculate that".
  tan: (x: number) => (turn(x) % 180 === 90 ? NaN : turn(x) % 180 === 0 ? 0 : Math.tan(toRadians(x))),
};

/** The value of `expr`, rounded to 10 significant digits ("0.1 + 0.2" → "0.3"); null when it can't be computed. */
export function calculate(expr: string, { degrees = true, ans = null }: { degrees?: boolean; ans?: string | null } = {}) {
  const normalized = normalize(expr, ans);
  if (!normalized) return null;
  try {
    // Scope functions take the place of mathjs's radian sin/cos/tan.
    const value: unknown = evaluate(normalized, degrees ? { ...DEGREES } : {});
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    // Radian trig leaves floating-point dust ("sin(π)" ≈ 1.2e-16); the keypad has no way to type a number this small.
    return format(Math.abs(value) < 1e-12 ? 0 : value, { precision: 10 });
  } catch {
    return null;
  }
}

/** Applies one key press. */
export function press(state: CalcState, key: CalcKey, degrees: boolean): CalcState {
  const done = state.result !== null;
  // After "=", a new number starts fresh and an operator carries on from the answer.
  const base = done ? { ...state, expr: '', result: null, history: `${state.expr} = ${state.result}` } : { ...state, error: false };

  switch (key.type) {
    case 'clear':
      return { ...EMPTY, ans: state.ans, history: state.history };
    case 'delete':
      return done ? { ...state, result: null } : { ...base, expr: state.expr.replace(LAST_TOKEN, '') };
    case 'insert':
      return { ...base, expr: base.expr + key.text };
    case 'operator': {
      const text = ['+', '−', '×', '÷'].includes(key.text) ? ` ${key.text} ` : key.text;
      return { ...base, expr: (done ? 'Ans' : base.expr) + text };
    }
    case 'paren': {
      const open = count(base.expr, '(') - count(base.expr, ')');
      // Close when a bracket is open and the last thing typed can end one ("3", ")", "π", "²", "%", "Ans").
      const close = open > 0 && /[\d.)π²%s]$/.test(base.expr);
      return { ...base, expr: base.expr + (close ? ')' : '(') };
    }
    case 'equals': {
      if (done || !state.expr.trim()) return state;
      const result = calculate(state.expr, { degrees, ans: state.ans });
      return result === null ? { ...state, error: true } : { ...state, result, ans: result, error: false };
    }
  }
}

/** What "Explain step by step" asks Lucid. */
export function explainQuestion(expr: string, result: string | null, degrees: boolean) {
  const angles = degrees && /sin|cos|tan/.test(expr) ? ' (angles in degrees)' : '';
  return `Explain step by step how to work out ${expr}${result ? ` = ${result}` : ''}${angles}.`;
}
