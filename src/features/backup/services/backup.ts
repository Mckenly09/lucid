// Local backup (roadmap v1): one account's study data as a .json file. The file comes from outside the app on
// Import, so every row is checked here before anything touches the database.
import { SUBJECTS } from '@/llm/subjects/config';

type Check = (v: unknown) => boolean;

// No length limits: they'd have to match every input in the app, and one long row would refuse the whole backup.
// The file size limit (backup.ts) already bounds memory.
const text: Check = (v) => typeof v === 'string';
const int: Check = (v) => Number.isSafeInteger(v) && (v as number) >= 0;
const num: Check = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const orNull =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const subject: Check = (v) => SUBJECTS.some((s) => s.id === v);
const id = text;
/** messages.sources: a JSON array of source-chip labels. */
const sources: Check = (v) => {
  if (!text(v)) return false;
  try {
    const list: unknown = JSON.parse(v as string);
    return Array.isArray(list) && list.every(text);
  } catch {
    return false;
  }
};

/** Exported columns per table (database names, no uid: Import keys everything to the current account). */
export const SCHEMA = {
  chats: { id, subject, title: text, preview: text, created_at: int, updated_at: int },
  messages: {
    chat_id: id,
    role: (v: unknown) => v === 'user' || v === 'assistant',
    content: text,
    sources: orNull(sources),
    created_at: int,
  },
  cards: {
    id,
    subject,
    front: text,
    back: text,
    chat_id: orNull(id),
    ease: num,
    interval_days: int,
    reps: int,
    due_at: int,
    created_at: int,
    updated_at: int,
  },
  quizResults: { subject, chat_id: orNull(id), score: int, total: int, created_at: int },
  userPacks: { id, name: text, subject, created_at: int, updated_at: int },
  userNotes: { pack_id: id, title: text, text: text, created_at: int, updated_at: int },
} satisfies Record<string, Record<string, Check>>;

type Table = keyof typeof SCHEMA;
export type Row = Record<string, string | number | null>;
export type BackupData = Record<Table, Row[]>;
export type Backup = { app: 'lucid'; version: 1; exportedAt: number; data: BackupData };

export const TABLES = Object.keys(SCHEMA) as Table[];

export const makeBackup = (data: BackupData, now = Date.now()): Backup => ({ app: 'lucid', version: 1, exportedAt: now, data });

/** Keeps only the known columns; null when a row is missing one or has a bad value. */
function rows(value: unknown, schema: Record<string, Check>): Row[] | null {
  if (!Array.isArray(value)) return null;
  const out: Row[] = [];
  for (const r of value) {
    if (typeof r !== 'object' || r === null) return null;
    const row: Row = {};
    for (const [col, check] of Object.entries(schema)) {
      const v = (r as Record<string, unknown>)[col];
      if (!check(v)) return null;
      row[col] = v as Row[string];
    }
    out.push(row);
  }
  return out;
}

const unique = (list: Row[]) => new Set(list.map((r) => r.id)).size === list.length;

/** A backup file's text → its data, or null when it isn't a valid Lucid backup (nothing is half-imported). */
export function parseBackup(json: string): BackupData | null {
  let file: unknown;
  try {
    file = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof file !== 'object' || file === null) return null;
  const { app, version, data } = file as Record<string, unknown>;
  if (app !== 'lucid' || version !== 1 || typeof data !== 'object' || data === null) return null;

  const out = {} as BackupData;
  for (const t of TABLES) {
    const list = rows((data as Record<string, unknown>)[t], SCHEMA[t]);
    if (!list) return null;
    out[t] = list;
  }
  if (!unique(out.chats) || !unique(out.cards) || !unique(out.userPacks)) return null;
  // Links must point inside the file: a message or note without its chat or pack would be lost or orphaned.
  const chats = new Set(out.chats.map((c) => c.id));
  const packs = new Set(out.userPacks.map((p) => p.id));
  const linked = (v: Row[string], ids: Set<Row[string]>) => v === null || ids.has(v);
  const ok =
    out.messages.every((m) => chats.has(m.chat_id)) &&
    out.cards.every((c) => linked(c.chat_id, chats)) &&
    out.quizResults.every((q) => linked(q.chat_id, chats)) &&
    out.userNotes.every((n) => packs.has(n.pack_id));
  return ok ? out : null;
}

/** New ids for chats, cards and packs (and the links to them), so an import never clashes with existing rows. */
export function rekey(data: BackupData, newId: () => string): BackupData {
  // One map per table: a chat and a pack may share an id in the file.
  const renew = (list: Row[]) => new Map(list.map((r) => [r.id, newId()]));
  const chatIds = renew(data.chats);
  const packIds = renew(data.userPacks);
  const chat = (v: Row[string]) => (v === null ? null : (chatIds.get(v) ?? null));
  return {
    chats: data.chats.map((c) => ({ ...c, id: chat(c.id) })),
    messages: data.messages.map((m) => ({ ...m, chat_id: chat(m.chat_id) })),
    cards: data.cards.map((c) => ({ ...c, id: newId(), chat_id: chat(c.chat_id) })),
    quizResults: data.quizResults.map((q) => ({ ...q, chat_id: chat(q.chat_id) })),
    userPacks: data.userPacks.map((p) => ({ ...p, id: packIds.get(p.id) ?? null })),
    userNotes: data.userNotes.map((n) => ({ ...n, pack_id: packIds.get(n.pack_id) ?? null })),
  };
}
