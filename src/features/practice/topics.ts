import type { CatalogPack } from '@/features/knowledge/services/catalog';
import { SUBJECTS, type SubjectId } from '@/llm/subjects/config';

// Topic names live with the pack builder (DepEd topic names, docs/packs.md); packs store only the codes. ~8 KB.
import TOPICS from '../../../tools/packs/topics.json';

type TopicEntry = { code: string; name: string };

// Curriculum order, so topics list the way the school year runs rather than alphabetically.
const ORDER = Object.entries(TOPICS as Record<string, unknown>)
  .filter(([key]) => !key.startsWith('_'))
  .flatMap(([, grades]) => Object.values(grades as Record<string, TopicEntry[]>).flat());
const INDEX = new Map(ORDER.map((t, i) => [t.code, { name: t.name, i }]));

/** "sci9-volcanoes" → "Volcanoes"; a code missing from topics.json still reads ("Sci9 volcanoes"). */
export function topicName(code: string) {
  const known = INDEX.get(code)?.name;
  if (known) return known;
  const words = code.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type PracticeTopic = { code: string; name: string; subject: SubjectId; grade: number; packs: CatalogPack[] };

const SUBJECT_IDS = new Set<string>(SUBJECTS.map((s) => s.id));

/**
 * Every topic the installed packs cover, in curriculum order. A topic found in two packs is one entry with both, so a
 * session draws from all of them. `list` reads a pack's topics (pack-files `packTopics`; injected for tests).
 */
export function practiceTopics(
  installed: CatalogPack[],
  list: (p: CatalogPack) => { subject: string; grade: number; topic: string }[],
): PracticeTopic[] {
  const byKey = new Map<string, PracticeTopic>();
  for (const pack of installed) {
    let rows: ReturnType<typeof list>;
    try {
      rows = list(pack);
    } catch {
      continue; // A pack file that won't open shouldn't hide the others.
    }
    for (const r of rows) {
      if (!SUBJECT_IDS.has(r.subject)) continue;
      const key = `${r.subject}|${r.grade}|${r.topic}`;
      const found = byKey.get(key);
      if (found) found.packs.push(pack);
      else
        byKey.set(key, {
          code: r.topic,
          name: topicName(r.topic),
          subject: r.subject as SubjectId,
          grade: r.grade,
          packs: [pack],
        });
    }
  }
  const at = (code: string) => INDEX.get(code)?.i ?? Number.MAX_SAFE_INTEGER;
  return [...byKey.values()].sort(
    (a, b) => a.grade - b.grade || at(a.code) - at(b.code) || a.name.localeCompare(b.name),
  );
}

/** Names the pack versions a topic's questions came from, so an updated pack never reuses old cached questions. */
export const packKey = (t: PracticeTopic) =>
  t.packs
    .map((p) => `${p.id}@${p.version}`)
    .sort()
    .join(',');
