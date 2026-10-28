import { ELEMENTS, elementSummary, searchElements } from './elements';

const el = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;

it('places every element in its own cell', () => {
  expect(ELEMENTS).toHaveLength(118);
  expect(new Set(ELEMENTS.map((e) => `${e.row}:${e.col}`)).size).toBe(118);
});

it('puts elements in the right group and period', () => {
  expect(el('H')).toMatchObject({ group: 1, period: 1, row: 1, col: 1 });
  expect(el('He')).toMatchObject({ group: 18, period: 1 });
  expect(el('B')).toMatchObject({ group: 13, period: 2 });
  expect(el('Al')).toMatchObject({ group: 13, period: 3 });
  expect(el('Fe')).toMatchObject({ group: 8, period: 4 });
  expect(el('La')).toMatchObject({ group: 3, period: 6 });
  expect(el('Hf')).toMatchObject({ group: 4, period: 6 });
  expect(el('Og')).toMatchObject({ group: 18, period: 7 });
});

it('puts the lanthanides and actinides in the rows below, starting under group 4', () => {
  expect(el('Ce')).toMatchObject({ group: null, row: 9, col: 4 });
  expect(el('Lu')).toMatchObject({ group: null, row: 9, col: 17 });
  expect(el('Th')).toMatchObject({ group: null, row: 10, col: 4 });
});

it('shows carbon like the design', () => {
  expect(el('C')).toMatchObject({ name: 'Carbon', mass: '12.011', config: '[He] 2s² 2p²', category: 'nonmetal', valence: 4 });
  expect(elementSummary(el('C'))).toBe('Nonmetal · Group 14 · Period 2');
  expect(elementSummary(el('Ce'))).toBe('Lanthanide · Period 6');
});

it('gives valence electrons for main groups only', () => {
  expect([el('Na').valence, el('He').valence, el('Ne').valence, el('Cl').valence, el('Fe').valence]).toEqual([1, 2, 8, 7, null]);
});

it('groups the legend categories', () => {
  expect([el('Na'), el('Ca'), el('Fe'), el('Si'), el('Cl'), el('Ar')].map((e) => e.category)).toEqual([
    'reactive',
    'reactive',
    'metal',
    'metalloid',
    'nonmetal',
    'noble',
  ]);
});

it('searches by name, symbol or number', () => {
  expect(searchElements('carb').map((e) => e.symbol)).toEqual(['C']);
  expect(searchElements('c')[0].symbol).toBe('C');
  expect(searchElements('Fe').map((e) => e.symbol)).toEqual(['Fe', 'Fm']); // iron before fermium
  expect(searchElements('n')[0].symbol).toBe('N');
  expect(searchElements('26').map((e) => e.symbol)).toEqual(['Fe']);
  expect(searchElements('  ')).toHaveLength(118);
  expect(searchElements('xyz')).toEqual([]);
});
