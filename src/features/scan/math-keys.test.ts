import { insertKey, MATH_KEYS } from './math-keys';

const key = (label: string) => MATH_KEYS.find((k) => k.label === label)!;
const at = (n: number) => ({ start: n, end: n });

describe('insertKey', () => {
  it('turns a read-apart fraction into one', () => {
    // OCR reads a stacked ¾ as "3 4": put the cursor on the space, select it, tap /.
    expect(insertKey('Add 3 4 and 1', { start: 5, end: 6 }, key('/'))).toEqual({ text: 'Add 3/4 and 1', cursor: 6 });
  });

  it('puts the cursor inside an empty square root', () => {
    expect(insertKey('Find ', at(5), key('√'))).toEqual({ text: 'Find sqrt()', cursor: 10 });
  });

  it('wraps the selected number in a square root', () => {
    expect(insertKey('Find 49', { start: 5, end: 7 }, key('√'))).toEqual({ text: 'Find sqrt(49)', cursor: 13 });
  });

  it('adds squared after the cursor', () => {
    expect(insertKey('x + 1 = 10', at(1), key('x²'))).toEqual({ text: 'x^2 + 1 = 10', cursor: 3 });
  });

  it('works on an empty box and with a backwards or out-of-range selection', () => {
    expect(insertKey('', at(0), key('π'))).toEqual({ text: 'π', cursor: 1 });
    expect(insertKey('2 3', { start: 2, end: 1 }, key('×'))).toEqual({ text: '2×3', cursor: 2 });
    expect(insertKey('ab', at(9), key('( )'))).toEqual({ text: 'ab()', cursor: 3 });
  });
});

describe('fraction key', () => {
  it('starts an empty fraction with the cursor on top', () => {
    expect(insertKey('g(x) = ', at(7), key('a/b'))).toEqual({ text: 'g(x) = ()/()', cursor: 8 });
  });

  it('turns the selected top into a fraction and moves to the bottom', () => {
    // From the scan "g(x) = x-1 x+2": select "x-1", tap a/b, then the bottom is typed in the second brackets.
    const top = insertKey('g(x) = x-1', { start: 7, end: 10 }, key('a/b'));
    expect(top).toEqual({ text: 'g(x) = (x-1)/()', cursor: 14 });
    expect(top.text.slice(0, top.cursor) + 'x+2' + top.text.slice(top.cursor)).toBe('g(x) = (x-1)/(x+2)');
  });
});
