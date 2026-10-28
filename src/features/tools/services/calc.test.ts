import { calculate, type CalcKey, type CalcState, EMPTY, explainQuestion, press } from './calc';

const digit = (text: string): CalcKey => ({ type: 'insert', text });
const op = (text: '+' | '−' | '×' | '÷' | '^' | '%' | '²'): CalcKey => ({ type: 'operator', text });
const run = (keys: CalcKey[], degrees = true, from: CalcState = EMPTY) => keys.reduce((s, k) => press(s, k, degrees), from);

describe('calculate', () => {
  it('works out the design examples', () => {
    expect(calculate('√(3² + 4²)')).toBe('5');
    expect(calculate('sin(30) × 4')).toBe('2');
  });

  it('rounds floating-point noise', () => {
    expect(calculate('0.1 + 0.2')).toBe('0.3');
    expect(calculate('1 ÷ 3')).toBe('0.3333333333');
  });

  it('gives exact trig values at the school angles', () => {
    expect(['cos(90)', 'sin(180)', 'cos(270)', 'sin(360)', 'tan(180)', 'sin(−180)'].map((e) => calculate(e))).toEqual(['0', '0', '0', '0', '0', '0']);
    expect(calculate('tan(90)')).toBeNull(); // undefined, not 1.6e16
    expect(calculate('tan(−90)')).toBeNull();
    expect(calculate('sin(π)', { degrees: false })).toBe('0');
    expect(calculate('cos(π ÷ 2)', { degrees: false })).toBe('0');
  });

  it('uses degrees or radians for trig', () => {
    expect(calculate('cos(60)')).toBe('0.5');
    expect(calculate('sin(π ÷ 2)', { degrees: false })).toBe('1');
  });

  it('knows log, ln, powers, percent, π and the last answer', () => {
    expect(calculate('log(1000)')).toBe('3');
    expect(calculate('ln(1)')).toBe('0');
    expect(calculate('2^10')).toBe('1024');
    expect(calculate('50% × 80')).toBe('40');
    expect(calculate('2π')).toBe('6.283185307');
    expect(calculate('Ans × 2', { ans: '21' })).toBe('42');
  });

  it('closes brackets the student left open', () => {
    expect(calculate('√(16')).toBe('4');
  });

  it('refuses what has no number answer', () => {
    expect(calculate('1 ÷ 0')).toBeNull();
    expect(calculate('√(−1)')).toBeNull();
    expect(calculate('2 +')).toBeNull();
    expect(calculate('Ans + 1')).toBeNull(); // no previous answer yet
  });
});

describe('press', () => {
  it('types an expression and evaluates it', () => {
    const s = run([digit('√('), digit('9'), { type: 'paren' }, op('+'), digit('1'), { type: 'equals' }]);
    expect(s).toMatchObject({ expr: '√(9) + 1', result: '4', ans: '4', error: false });
  });

  it('starts fresh after "=" for a number, and carries on with Ans for an operator', () => {
    const done = run([digit('2'), op('×'), digit('3'), { type: 'equals' }]);
    expect(press(done, digit('7'), true)).toMatchObject({ expr: '7', result: null, history: '2 × 3 = 6' });
    expect(press(done, op('+'), true)).toMatchObject({ expr: 'Ans + ', history: '2 × 3 = 6' });
    expect(run([op('+'), digit('1'), { type: 'equals' }], true, done).result).toBe('7');
  });

  it('opens or closes a bracket as needed', () => {
    expect(run([{ type: 'paren' }]).expr).toBe('(');
    expect(run([{ type: 'paren' }, digit('2'), { type: 'paren' }]).expr).toBe('(2)');
    expect(run([digit('sin('), { type: 'paren' }]).expr).toBe('sin((');
  });

  it('deletes whole tokens', () => {
    expect(run([digit('2'), op('+'), { type: 'delete' }]).expr).toBe('2');
    expect(run([digit('sin('), { type: 'delete' }]).expr).toBe('');
    expect(run([digit('12'), { type: 'delete' }]).expr).toBe('1');
  });

  it('flags an error without losing the expression, and clears it on the next key', () => {
    const bad = run([digit('1'), op('÷'), digit('0'), { type: 'equals' }]);
    expect(bad).toMatchObject({ expr: '1 ÷ 0', error: true, result: null });
    expect(press(bad, { type: 'delete' }, true)).toMatchObject({ expr: '1 ÷ ', error: false });
  });

  it('AC keeps the last answer and history', () => {
    const done = run([digit('5'), { type: 'equals' }, digit('1')]);
    expect(press(done, { type: 'clear' }, true)).toMatchObject({ expr: '', ans: '5', history: '5 = 5' });
  });
});

it('asks Lucid to explain, mentioning degrees for trig', () => {
  expect(explainQuestion('sin(30) × 4', '2', true)).toBe('Explain step by step how to work out sin(30) × 4 = 2 (angles in degrees).');
  expect(explainQuestion('√(3² + 4²)', '5', true)).toBe('Explain step by step how to work out √(3² + 4²) = 5.');
});
