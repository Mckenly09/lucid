import { SUBJECTS, type SubjectId } from '@/llm/subjects/config';

/** Packs and their catalog live in the public repo Mckenly09/lucid-packs (built by tools/packs, docs/packs.md §3). */
export const PACKS_BASE_URL = 'https://raw.githubusercontent.com/Mckenly09/lucid-packs/main/';
export const CATALOG_URL = `${PACKS_BASE_URL}catalog.json`;

export type CatalogPack = {
  id: string;
  name: string;
  subject: SubjectId;
  grades: number[];
  version: number;
  sizeMB: number;
  sha256: string;
  url: string;
  license: string;
  attribution: string;
};

const SUBJECT_IDS = new Set<string>(SUBJECTS.map((s) => s.id));
const isText = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max;

/**
 * The catalog comes from the network, so every field is checked before the app trusts it. A bad entry is skipped,
 * not fatal. Ids become file names, so they're limited to [a-z0-9-]; downloads must come from the packs repo.
 */
export function parseCatalog(json: unknown): CatalogPack[] {
  const list = (json as { packs?: unknown } | null)?.packs;
  if (!Array.isArray(list)) throw new Error('Not a pack catalog');
  return list.flatMap((raw): CatalogPack[] => {
    if (!raw || typeof raw !== 'object') return [];
    const p = raw as Record<string, unknown>;
    const ok =
      typeof p.id === 'string' &&
      /^[a-z0-9-]{1,40}$/.test(p.id) &&
      isText(p.name, 80) &&
      typeof p.subject === 'string' &&
      SUBJECT_IDS.has(p.subject) &&
      Array.isArray(p.grades) &&
      p.grades.every((g) => Number.isInteger(g)) &&
      Number.isInteger(p.version) &&
      (p.version as number) > 0 &&
      typeof p.sizeMB === 'number' &&
      p.sizeMB > 0 &&
      p.sizeMB <= 30 &&
      typeof p.sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(p.sha256) &&
      typeof p.url === 'string' &&
      p.url.startsWith(PACKS_BASE_URL) &&
      isText(p.license, 80) &&
      isText(p.attribution);
    return ok ? [p as CatalogPack] : [];
  });
}

/** Where a pack lives on the phone; from id and version only, never from the URL. */
export const packFileName = (p: { id: string; version: number }) => `${p.id}-v${p.version}.sqlite`;

export const gradesLabel = (grades: number[]) =>
  grades.length === 0 ? '' : grades.length === 1 ? `Grade ${grades[0]}` : `Grades ${Math.min(...grades)}–${Math.max(...grades)}`;
