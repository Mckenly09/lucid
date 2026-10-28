import { solveLinearSystem, statesSolution } from './linear';

const values = (text: string) => {
  const s = solveLinearSystem(text);
  return s?.kind === 'unique' ? s.values : s?.kind;
};

describe('solveLinearSystem', () => {
  it('solves the reported system by adding the equations (regression: model answered x = 5 - 2y)', () => {
    expect(solveLinearSystem('Solve 2x + y = 7 and x - y = 2')).toEqual({
      kind: 'unique',
      values: { x: '3', y: '1' },
      answer: 'x = 3, y = 1',
      steps: [
        '2x + y = 7',
        'x - y = 2',
        '',
        'Add the equations to eliminate y:',
        '3x = 9',
        '',
        'Divide both sides by 3:',
        'x = 3',
        '',
        'Substitute x = 3 into x - y = 2:',
        '3 - y = 2',
        '-y = -1',
        'y = 1',
        '',
        'Check: x = 3 and y = 1 make both equations true.',
        '',
        'Final answer:',
        'x = 3, y = 1',
      ].join('\n'),
    });
  });

  it('subtracts when a variable has the same coefficient', () => {
    const s = solveLinearSystem('3x + 2y = 12\nx + 2y = 8');
    expect(s?.steps).toContain('Subtract the second equation from the first to eliminate y:\n2x = 4');
    expect(values('3x + 2y = 12\nx + 2y = 8')).toEqual({ x: '2', y: '3' });
  });

  it('multiplies by a coefficient first when nothing cancels', () => {
    const s = solveLinearSystem('2x + 3y = 13, 3x + 4y = 18');
    expect(s?.steps).toContain('Multiply the first equation by 4 and the second by 3:\n8x + 12y = 52\n9x + 12y = 54');
    expect(values('2x + 3y = 13, 3x + 4y = 18')).toEqual({ x: '2', y: '3' });
  });

  it('gives negative and fractional answers exactly', () => {
    expect(values('x + y = 1, x - y = -4')).toEqual({ x: '-3/2', y: '5/2' });
    expect(values('0.5x + y = 2, x − y = 1')).toEqual({ x: '2', y: '1' });
    expect(values('1/2x + y = 3, x - y = 0')).toEqual({ x: '2', y: '2' });
  });

  it('reports no solution and infinitely many solutions', () => {
    expect(solveLinearSystem('x + y = 2, 2x + 2y = 5')).toMatchObject({ kind: 'none', answer: 'No solution' });
    expect(solveLinearSystem('x + y = 2, 2x + 2y = 4')).toMatchObject({ kind: 'infinite' });
  });

  it('moves variables from both sides first', () => {
    const s = solveLinearSystem('3x = y + 7, x + y = 5');
    expect(s?.steps).toContain('Move the variables to the left side and the numbers to the right:\n3x - y = 7\nx + y = 5');
    expect(values('3x = y + 7, x + y = 5')).toEqual({ x: '3', y: '2' });
  });

  it('works inside Filipino text and with other letters', () => {
    expect(values('Lutasin: 2a + b = 7 at a - b = 2.')).toEqual({ a: '3', b: '1' });
  });

  it('reads thousands separators as part of the number', () => {
    expect(values('x + y = 1,000 and x - y = 200')).toEqual({ x: '600', y: '400' });
  });

  it('skips a lead-in that names the variables', () => {
    expect(values('Solve for x and y: 2x + y = 7 and x - y = 2')).toEqual({ x: '3', y: '1' });
    expect(values('Find x and y if 2x + y = 7 and x - y = 2')).toEqual({ x: '3', y: '1' });
    expect(values('Hanapin ang x at y kung 2x + y = 7 at x - y = 2')).toEqual({ x: '3', y: '1' });
  });

  it('leaves unsupported input to the model', () => {
    for (const text of [
      'Solve 2x + 5 = 17', // one equation
      'x^2 + y = 3, x - y = 1', // not linear
      '2(x + y) = 10, x - y = 2', // brackets
      'x + y + z = 6, x - y = 1', // three variables
      'x + y = 3, x - y = 1, 2x + y = 5', // three equations
      'x^2 + y = 3, x - y = 1, x + y = 5', // two readable ones must not hide the third
      '2x + y = 7 x - y = 2', // no separator: can't tell where one ends
      'What is 5 + 3?',
      '',
    ])
      expect(solveLinearSystem(text)).toBeNull();
  });
});

describe('statesSolution', () => {
  const s = solveLinearSystem('2x + y = 7, x - y = 2')!;

  it('accepts an answer with both values', () => {
    expect(statesSolution('Answer: x = 3, y = 1', s)).toBe(true);
  });

  it('rejects a rearrangement or a coefficient that looks like the value', () => {
    expect(statesSolution('Answer: x = 5 - 2y', s)).toBe(false);
    expect(statesSolution('2x = 3 and y = 1', s)).toBe(false);
    expect(statesSolution('x = 30, y = 1', s)).toBe(false);
  });
});
