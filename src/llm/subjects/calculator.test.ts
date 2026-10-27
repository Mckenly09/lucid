import { checkArithmetic } from './calculator';

describe('checkArithmetic', () => {
  it('leaves correct arithmetic alone and counts it', () => {
    const r = checkArithmetic('1 + 1 = 2');
    expect(r).toEqual({ text: '1 + 1 = 2', checked: 1, wrong: 0 });
  });

  it('marks a wrong result with the calculator value', () => {
    expect(checkArithmetic('1 + 1 = 3').text).toBe('1 + 1 = 3 (calculator: 2)');
  });

  it('checks each step of a chain and skips the algebra', () => {
    const r = checkArithmetic('2x = 17 − 5 = 13\nx = 12 ÷ 2 = 6');
    expect(r.text).toBe('2x = 17 − 5 = 13 (calculator: 12)\nx = 12 ÷ 2 = 6');
    expect(r).toMatchObject({ checked: 2, wrong: 1 });
  });

  it('does not mistake "2x + 5 = 17" for arithmetic', () => {
    expect(checkArithmetic('Solve 2x + 5 = 17')).toMatchObject({ checked: 0, wrong: 0 });
  });

  it('accepts rounding to the precision written, including ≈ and π', () => {
    expect(checkArithmetic('A = π × 49 ≈ 153.94 cm²')).toMatchObject({ checked: 1, wrong: 0 });
    expect(checkArithmetic('10 / 3 = 3.33')).toMatchObject({ checked: 1, wrong: 0 });
    expect(checkArithmetic('10 / 3 = 3.4').wrong).toBe(1);
  });

  it('handles ×, unicode minus, powers, thousands and implicit multiplication', () => {
    expect(checkArithmetic('2(6) + 5 = 12 + 5 = 17').wrong).toBe(0);
    expect(checkArithmetic('3 × 4 − 2 = 10').wrong).toBe(0);
    expect(checkArithmetic('2^10 = 1,024').wrong).toBe(0);
    expect(checkArithmetic('1,000 + 250 = 1,250').wrong).toBe(0);
  });

  it('only compares against a plain number, not another expression', () => {
    // "12 + 5" on the right is checked by the next pair, not read as 12.
    expect(checkArithmetic('7 + 10 = 12 + 5').wrong).toBe(0);
  });

  it('ignores text without an operator, like dates or list numbers', () => {
    expect(checkArithmetic('1. The year = 1896\nStep 2 = done')).toMatchObject({ checked: 0 });
  });

  it('skips arithmetic glued to a word instead of checking half of it', () => {
    expect(checkArithmetic('cos(0) + 1 = 5')).toMatchObject({ checked: 0, wrong: 0 });
    expect(checkArithmetic('3x(2) + 1 = 9')).toMatchObject({ checked: 0 });
  });
});
