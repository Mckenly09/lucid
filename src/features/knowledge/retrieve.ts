import { searchUserNotes } from '@/db/user-packs';
import { NOTES_MAX_CHARS } from '@/llm/prompts';
import type { SubjectId } from '@/llm/subjects/config';

import { searchPack } from './pack-files';
import { ftsQuery, pickNotes } from './services/search';
import { usePacks } from './store';

const NONE = { notes: [] as string[], sources: [] as string[] };
/** Per source, so neither the student's notes nor a big pack crowds out the other. */
const PER_SOURCE = 2;
/** subjects.md: top 3. */
const MAX_NOTES = 3;

/** "Relating Pressure, …: The Ideal Gas Law" → "The Ideal Gas Law" for a short source chip; summaries name their section. */
const section = (title: string) => title.split(': ').filter((part) => part !== 'Key Concepts and Summary').pop() ?? title;

/** Each source searched on its own: a broken pack file or table costs its notes, not the answer. */
function safely<T>(what: string, search: () => T[]): T[] {
  try {
    return search();
  } catch (e) {
    console.warn(`${what} search failed`, e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Reference notes for a question (subjects.md: top 3, ~400 tokens) and the labels shown as source chips.
 * The student's own notes come first, then downloaded packs for the chat's subject (and General packs).
 */
export function findReferenceNotes(uid: string, subject: SubjectId, question: string) {
  const match = ftsQuery(question);
  if (!match) return NONE;

  const mine = safely('Note', () =>
    searchUserNotes(uid, subject, match, PER_SOURCE).map((h) => ({
      label: `Your notes · ${h.packName}`,
      text: `${h.title}\n${h.text}`,
    })),
  );
  const packs = Object.values(usePacks.getState().installed).filter((p) => p.subject === subject || p.subject === 'general');
  const fromPacks = packs.flatMap((p) =>
    safely(p.id, () =>
      searchPack(p, match, PER_SOURCE).map((h) => ({ label: `${p.name} · ${section(h.title)}`, text: `${h.title}\n${h.text}` })),
    ),
  );
  return pickNotes([...mine, ...fromPacks].slice(0, MAX_NOTES), NOTES_MAX_CHARS);
}
