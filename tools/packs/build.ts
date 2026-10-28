/// <reference types="node" />
// Pack builder (docs/packs.md §3): `npm run packs:build -- <packId>`. Runs on the developer's computer, never in the app.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { chunkParagraphs, mergeShortSections, openstaxSlug } from './lib/chunk.ts';
import { type Module, parseCollection, parseModule } from './lib/cnxml.ts';
import { type PageOptions, parseHtml } from './lib/html.ts';
import { checkLicense, licenseFromHost, licenseFromText, licenseFromUrl } from './lib/license.ts';
import { parseMarkdown } from './lib/markdown.ts';
import { type PackChunk, searchPack, writePack } from './lib/write.ts';

type Source = {
  id: string;
  title: string;
  authors: string;
  publisher: string;
  /** `openstax-git` (a pinned OpenStax repo) or `markdown` (our own notes in `dir`, one topic per file). */
  type: 'openstax-git' | 'markdown' | 'web';
  repo: string;
  commit: string;
  collection: string;
  /** markdown: folder under tools/packs with `<topic code>.md` files and a LICENSE. */
  dir?: string;
  /** web: pages from listed government sites, each pinned by the sha256 of its extracted text. */
  pages?: WebPage[];
  /** web: the day the pages were read (the pack's built_at, so rebuilds stay byte-identical). */
  retrieved?: string;
  license: string;
  licenseUrl: string;
  bookUrl: string;
  pagesUrl: string;
  evalOnly: boolean;
};
type Pack = {
  id: string;
  name: string;
  subject: string;
  version: number;
  source: string;
  /** openstax-git only: source module id → topic code. Markdown notes are tagged by file name. */
  topicMap?: Record<string, string>;
  /** Questions whose top search hit the report prints, as a smoke test. */
  checks?: string[];
};
type Topic = { code: string; name: string };
type WebPage = PageOptions & { url: string; topic: string; license: string; sha256?: string };

const ROOT = import.meta.dirname;
const CACHE = join(ROOT, '.cache');
const DIST = join(ROOT, 'dist');
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as T;
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const log = (s = '') => process.stdout.write(`${s}\n`);

/** 1. fetch: only the book's XML and LICENSE at the pinned commit; media (images) stay on GitHub. */
function fetchSource(source: Source) {
  const dir = join(CACHE, source.id);
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true });
    git(dir, 'init', '-q');
    git(dir, 'remote', 'add', 'origin', source.repo);
  }
  git(dir, 'sparse-checkout', 'set', '--no-cone', '/LICENSE', '/collections/*', '/modules/*/index.cnxml');
  git(dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', source.commit);
  git(dir, 'checkout', '-q', '--force', 'FETCH_HEAD');
  const commit = git(dir, 'rev-parse', 'HEAD');
  if (commit !== source.commit) throw new Error(`Fetched ${commit}, sources.json pins ${source.commit}.`);
  return { dir, commit };
}

type Config = { APP_COMMERCIAL: boolean; releaseBaseUrl: string; maxPackMB: number };
type Built = { chunks: PackChunk[]; commit: string; builtAt: string; attribution: string };

/** Steps 1–5 for an OpenStax book: fetch, license check, extract, tag, chunk (only mapped modules). */
function fromOpenStax(source: Source, pack: Pack, gradeOf: Map<string, number>, config: Config): Built {
  log(`Fetching ${source.repo} @ ${source.commit.slice(0, 7)}…`);
  const { dir, commit } = fetchSource(source);

  // 2. license check: the LICENSE file and the book's own metadata must both agree with sources.json.
  const collection = parseCollection(readFileSync(join(dir, source.collection), 'utf8'));
  checkLicense({
    found: [licenseFromText(readFileSync(join(dir, 'LICENSE'), 'utf8')), licenseFromUrl(collection.licenseUrl)],
    declared: source.license,
    commercial: config.APP_COMMERCIAL,
    evalOnly: source.evalOnly,
  });
  log(`License OK: ${source.license} (LICENSE file and collection metadata agree).`);

  // 3–5. extract, tag, chunk: only modules mapped to a topic; the rest are left out.
  const topicMap = pack.topicMap ?? {};
  const unknownTopics = Object.values(topicMap).filter((t) => !gradeOf.has(t));
  if (unknownTopics.length) throw new Error(`topicMap uses codes missing from topics.json: ${unknownTopics.join(', ')}`);
  const chunks: PackChunk[] = [];
  collection.chapters.forEach((chapter, ci) => {
    chapter.modules.forEach((moduleId, mi) => {
      if (!topicMap[moduleId]) return;
      const mod = parseModule(moduleId, readFileSync(join(dir, 'modules', moduleId, 'index.cnxml'), 'utf8'));
      // OpenStax numbers a chapter's Introduction page 0, then sections 1, 2, …
      const sourceUrl = source.pagesUrl + openstaxSlug(ci + 1, mi, mod.title);
      chunks.push(...toChunks(mod, pack.subject, topicMap[moduleId], gradeOf, sourceUrl));
    });
  });
  const missing = Object.keys(topicMap).filter((m) => !collection.chapters.some((c) => c.modules.includes(m)));
  if (missing.length) throw new Error(`topicMap modules not in ${source.collection}: ${missing.join(', ')}`);
  const attribution =
    `Adapted from ${source.title} by ${source.authors} (${source.publisher}), ${source.bookUrl}. ` +
    `Access for free at openstax.org. Licensed ${source.license} (${source.licenseUrl}). ` +
    'Changes: split into short notes; figures, tables and exercises removed.';
  return { chunks, commit, builtAt: git(dir, 'log', '-1', '--format=%cI'), attribution };
}

/** Steps 2–5 for our own notes: the folder's LICENSE must match sources.json; each file's name is its topic code. */
function fromNotes(source: Source, pack: Pack, gradeOf: Map<string, number>, config: Config): Built {
  if (!source.dir) throw new Error(`Source ${source.id} has no "dir".`);
  const dir = join(ROOT, source.dir);
  checkLicense({
    found: [licenseFromText(readFileSync(join(dir, 'LICENSE'), 'utf8'))],
    declared: source.license,
    commercial: config.APP_COMMERCIAL,
    evalOnly: source.evalOnly,
  });
  log(`License OK: ${source.license} (${source.dir}/LICENSE).`);

  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const unknown = files.map((f) => f.slice(0, -3)).filter((t) => !gradeOf.has(t));
  if (unknown.length) throw new Error(`Note files named after codes missing from topics.json: ${unknown.join(', ')}`);
  const hash = createHash('sha256');
  const chunks = files.flatMap((f) => {
    const md = readFileSync(join(dir, f), 'utf8');
    hash.update(f).update(md);
    return toChunks(parseMarkdown(f, md), pack.subject, f.slice(0, -3), gradeOf, source.bookUrl);
  });
  // Reproducible: the notes' content hash and last commit date. Uncommitted notes are fine to test, not to publish.
  const builtAt = git(ROOT, 'log', '-1', '--format=%cI', '--', source.dir) || 'uncommitted';
  if (builtAt === 'uncommitted') log(`Note: ${source.dir} is not committed yet; commit it before publishing.`);
  const attribution = `${source.title} by ${source.authors} (${source.publisher}), ${source.bookUrl}. Licensed ${source.license} (${source.licenseUrl}).`;
  return { chunks, commit: hash.digest('hex'), builtAt, attribution };
}

/**
 * Steps 1–5 for government web pages: each page is downloaded once into .cache, its host must be on the license
 * allowlist (lib/license.ts), and its extracted text must match the sha256 in sources.json, so a page that changed
 * since it was reviewed stops the build. A new page without a sha256 stops too, printing the value to record.
 */
function fromWeb(source: Source, pack: Pack, gradeOf: Map<string, number>, config: Config): Built {
  if (!source.pages?.length || !source.retrieved) throw new Error(`Source ${source.id} needs "pages" and "retrieved".`);
  const dir = join(CACHE, source.id);
  mkdirSync(dir, { recursive: true });
  const all = createHash('sha256');
  const problems: string[] = [];
  const chunks = source.pages.flatMap((page) => {
    checkLicense({ found: [licenseFromHost(page.url)], declared: page.license, commercial: config.APP_COMMERCIAL, evalOnly: false });
    if (!gradeOf.has(page.topic)) throw new Error(`${page.url}: topic ${page.topic} is missing from topics.json.`);
    const file = join(dir, `${createHash('sha256').update(page.url).digest('hex').slice(0, 16)}.html`);
    if (!existsSync(file)) {
      log(`Downloading ${page.url}…`);
      // No redirects: the license check must see the address the text really comes from.
      execFileSync('curl', ['-sSfL', '--max-redirs', '0', '--compressed', '--max-time', '60', '-o', file, page.url]);
    }
    const mod = parseHtml(page.url, readFileSync(file, 'utf8'), page);
    const text = createHash('sha256').update(JSON.stringify(mod)).digest('hex');
    all.update(text);
    if (!page.sha256) problems.push(`New page ${page.url}: review its text, then set "sha256": "${text}"`);
    else if (page.sha256 !== text) problems.push(`Page changed since review: ${page.url} (was ${page.sha256}, now ${text})`);
    return toChunks(mod, pack.subject, page.topic, gradeOf, page.url);
  });
  if (problems.length) throw new Error(`\n${problems.join('\n')}`);
  log(`License OK: ${source.pages.length} pages, all from listed government sites.`);
  const attribution =
    `Adapted from public web pages of ${source.authors}, retrieved ${source.retrieved}. ` +
    'US Government pages are in the public domain; Philippine Government works are used non-commercially (IP Code §176). ' +
    'Not endorsed by these agencies. Changes: split into short notes; images, menus and some tables removed. Each note links to its page.';
  return { chunks, commit: all.digest('hex'), builtAt: source.retrieved, attribution };
}

/** A module's sections → tagged chunks (short sections merged, long ones split). */
function toChunks(mod: Module, subject: string, topic: string, gradeOf: Map<string, number>, sourceUrl: string) {
  return mergeShortSections(mod.sections).flatMap((section) => {
    const title = mod.title.includes(section.title) ? mod.title : `${mod.title}: ${section.title}`;
    return chunkParagraphs(section.paragraphs).map((text) => ({ subject, grade: gradeOf.get(topic) ?? 0, topic, title, text, sourceUrl }));
  });
}

function build(packId: string) {
  const config = readJson<Config>('config.json');
  const pack = readJson<{ packs: Pack[] }>('packs.json').packs.find((p) => p.id === packId);
  if (!pack) throw new Error(`No pack "${packId}" in packs.json.`);
  const source = readJson<{ sources: Source[] }>('sources.json').sources.find((s) => s.id === pack.source);
  if (!source) throw new Error(`No source "${pack.source}" in sources.json.`);
  const topics = readJson<Record<string, Record<string, Topic[]> | string>>('topics.json')[pack.subject];
  if (!topics || typeof topics === 'string') throw new Error(`No topics for ${pack.subject} in topics.json.`);
  const gradeOf = new Map<string, number>();
  for (const [grade, list] of Object.entries(topics)) for (const t of list) gradeOf.set(t.code, Number(grade));

  const { chunks, commit, builtAt, attribution } =
    source.type === 'markdown'
      ? fromNotes(source, pack, gradeOf, config)
      : source.type === 'web'
        ? fromWeb(source, pack, gradeOf, config)
        : fromOpenStax(source, pack, gradeOf, config);

  // 6. write SQLite
  const grades = [...new Set(chunks.map((c) => c.grade))].sort((a, b) => a - b);
  mkdirSync(DIST, { recursive: true });
  const fileName = `${pack.id}-v${pack.version}.sqlite`;
  const file = join(DIST, fileName);
  writePack(
    file,
    {
      id: pack.id,
      name: pack.name,
      subject: pack.subject,
      grades: grades.join(','),
      version: String(pack.version),
      license: source.license,
      attribution,
      source_url: source.bookUrl,
      source_commit: commit,
      // The source's commit date, not the clock: the same source and builder give the same bytes (and sha256).
      built_at: builtAt,
    },
    chunks,
  );

  // 7. report
  const bytes = statSync(file).size;
  const sizeMB = Math.round((bytes / 1024 ** 2) * 10) / 10;
  if (sizeMB > config.maxPackMB) throw new Error(`${fileName} is ${sizeMB} MB, over the ${config.maxPackMB} MB limit.`);
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  const perTopic = new Map<string, number>();
  for (const c of chunks) perTopic.set(c.topic, (perTopic.get(c.topic) ?? 0) + 1);
  const words = chunks.map((c) => c.text.split(/\s+/).length);

  log(`\n== ${fileName}`);
  log(`Chunks: ${chunks.length} (words per chunk: min ${Math.min(...words)}, median ${words.sort((a, b) => a - b)[words.length >> 1]}, max ${Math.max(...words)})`);
  log(`Size: ${sizeMB} MB · sha256 ${sha256}`);
  log(`License: ${source.license}`);
  log(`Attribution: ${attribution}`);
  log('Topics covered:');
  for (const [grade, list] of Object.entries(topics)) {
    for (const t of list) if (perTopic.has(t.code)) log(`  G${grade} ${t.name} (${t.code}): ${perTopic.get(t.code)} chunks`);
  }
  const notCovered = [...new Set(Object.values(pack.topicMap ?? {}))].filter((t) => !perTopic.has(t));
  if (notCovered.length) log(`Mapped but empty: ${notCovered.join(', ')}`);

  log('\nSearch check (FTS5, top hit):');
  for (const q of pack.checks ?? []) {
    const match = q.split(/\W+/).filter(Boolean).map((w) => `"${w}"`).join(' OR ');
    const hit = searchPack(file, match, 1)[0];
    log(`  "${q}" → ${hit ? `${hit.title} [${hit.topic}]` : 'no hit'}`);
  }

  // 8. catalog (what the app reads to list packs)
  const catalogFile = join(DIST, 'catalog.json');
  const catalog = existsSync(catalogFile)
    ? (JSON.parse(readFileSync(catalogFile, 'utf8')) as { packs: { id: string }[] })
    : { packs: [] };
  const entry = {
    id: pack.id,
    name: pack.name,
    subject: pack.subject,
    grades,
    version: pack.version,
    sizeMB,
    sha256,
    url: config.releaseBaseUrl + fileName,
    license: source.license,
    attribution,
  };
  catalog.packs = [...catalog.packs.filter((p) => p.id !== pack.id), entry];
  writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
  log(`\nCatalog updated: ${catalogFile}`);
}

const packId = process.argv[2];
if (!packId) {
  process.stderr.write('Usage: npm run packs:build -- <packId>\n');
  process.exit(1);
}
try {
  build(packId);
} catch (e) {
  process.stderr.write(`\nBuild failed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
