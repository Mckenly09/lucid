import { ELEMENT_ROWS } from '../elements-data';

/** The design's five legend groups, light to dark. */
export type Category = 'reactive' | 'metal' | 'metalloid' | 'nonmetal' | 'noble';

export const CATEGORY_NAME: Record<Category, string> = {
  reactive: 'Reactive metals',
  metal: 'Transition & other metals',
  metalloid: 'Metalloids',
  nonmetal: 'Nonmetals',
  noble: 'Noble gases',
};

const CATEGORY_OF: Record<string, Category> = {
  'Alkali metal': 'reactive',
  'Alkaline earth metal': 'reactive',
  'Transition metal': 'metal',
  'Post-transition metal': 'metal',
  Lanthanide: 'metal',
  Actinide: 'metal',
  Metalloid: 'metalloid',
  Nonmetal: 'nonmetal',
  Halogen: 'nonmetal',
  'Noble gas': 'noble',
};

export type Element = {
  number: number;
  symbol: string;
  name: string;
  mass: string;
  /** "[He] 2s² 2p²" */
  config: string;
  category: Category;
  /** PubChem's finer name: "Halogen", "Transition metal"… */
  block: string;
  period: number;
  /** 1–18; null for the lanthanides and actinides shown in the rows below the table. */
  group: number | null;
  /** Main-group elements only; transition metals have no single number. */
  valence: number | null;
  /** Grid row (1–7 main table, 9–10 the f-block rows) and column, as the table draws it. */
  row: number;
  col: number;
};

const PERIOD_START = [1, 3, 11, 19, 37, 55, 87, 119];

function place(n: number) {
  const period = PERIOD_START.findIndex((start, i) => n >= start && n < PERIOD_START[i + 1]) + 1;
  const k = n - PERIOD_START[period - 1];
  if (period === 1) return { period, group: n === 1 ? 1 : 18 };
  if (period <= 3) return { period, group: k < 2 ? k + 1 : k + 11 };
  if (period <= 5) return { period, group: k + 1 };
  // Periods 6–7: La/Ac sit in group 3; the 14 after them are the f-block rows; Hf/Rf continue at group 4.
  if (k <= 2) return { period, group: k + 1 };
  if (k <= 16) return { period, group: null, fIndex: k - 3 };
  return { period, group: k - 13 };
}

/** "[He]2s2 2p2" → "[He] 2s² 2p²". */
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const formatConfig = (raw: string) =>
  raw
    .replace(/\]/, '] ')
    .replace(/([spdf])(\d+)/g, (_, orbital: string, count: string) => orbital + [...count].map((d) => SUPERSCRIPT[Number(d)]).join(''));

function valenceOf(number: number, group: number | null) {
  if (number === 2) return 2;
  if (group === 1 || group === 2) return group;
  if (group !== null && group >= 13) return group - 10;
  return null;
}

export const ELEMENTS: Element[] = ELEMENT_ROWS.map(([number, symbol, name, mass, config, block]) => {
  const p = place(number);
  return {
    number,
    symbol,
    name,
    mass,
    config: formatConfig(config),
    category: CATEGORY_OF[block] ?? 'metal',
    block,
    period: p.period,
    group: p.group,
    valence: valenceOf(number, p.group),
    // f-block rows start under group 4, after the La/Ac cell in group 3.
    row: p.group === null ? p.period + 3 : p.period,
    col: p.group ?? (p.fIndex ?? 0) + 4,
  };
});

/**
 * Elements whose name or symbol starts with `query`, or whose number is `query`; all of them for an empty query.
 * An exact symbol comes first, so "Fe" picks iron before fermium.
 */
export function searchElements(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return ELEMENTS;
  if (/^\d+$/.test(q)) return ELEMENTS.filter((e) => e.number === Number(q));
  const exact = (e: Element) => (e.symbol.toLowerCase() === q ? 0 : 1);
  return ELEMENTS.filter((e) => e.name.toLowerCase().startsWith(q) || e.symbol.toLowerCase().startsWith(q)).sort((a, b) => exact(a) - exact(b));
}

/** "Nonmetal · Group 14 · Period 2", or "Lanthanide · Period 6" for the f-block. */
export const elementSummary = (e: Element) =>
  [e.block, e.group !== null && `Group ${e.group}`, `Period ${e.period}`].filter(Boolean).join(' · ');
