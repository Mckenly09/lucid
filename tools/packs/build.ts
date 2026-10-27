/// <reference types="node" />
// Pack builder (docs/packs.md §3): `npm run packs:build -- <packId>`. Runs on the developer's computer, never in the app.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { chunkParagraphs, mergeShortSections, openstaxSlug } from './lib/chunk.ts';
import { parseCollection, parseModule } from './lib/cnxml.ts';
import { checkLicense, licenseFromText, licenseFromUrl } from './lib/license.ts';
import { type PackChunk, searchPack, writePack } from './lib/write.ts';

type Source = {
  id: string;
  title: string;
  authors: string;
  publisher: string;
  repo: string;
  commit: string;
  collection: string;
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
  topicMap: Record<string, string>;
  /** Questions whose top search hit the report prints, as a smoke test. */
  checks?: string[];
};
type Topic = { code: string; name: string };

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

function build(packId: string) {
  const config = readJson<{ APP_COMMERCIAL: boolean; releaseBaseUrl: string; maxPackMB: number }>('config.json');
  const pack = readJson<{ packs: Pack[] }>('packs.json').packs.find((p) => p.id === packId);
  if (!pack) throw new Error(`No pack "${packId}" in packs.json.`);
  const source = readJson<{ sources: Source[] }>('sources.json').sources.find((s) => s.id === pack.source);
  if (!source) throw new Error(`No source "${pack.source}" in sources.json.`);
  const topics = readJson<Record<string, Record<string, Topic[]> | string>>('topics.json')[pack.subject];
  if (!topics || typeof topics === 'string') throw new Error(`No topics for ${pack.subject} in topics.json.`);
  const gradeOf = new Map<string, number>();
  for (const [grade, list] of Object.entries(topics)) for (const t of list) gradeOf.set(t.code, Number(grade));

  log(`Fetching ${source.repo} @ ${source.commit.slice(0, 7)}…`);
  const { dir, commit } = fetchSource(source);

  // 2. license check: the LICENSE file and the book's own metadata must both agree with sources.json.
  const collectionXml = readFileSync(join(dir, source.collection), 'utf8');
  const collection = parseCollection(collectionXml);
  checkLicense({
    found: [licenseFromText(readFileSync(join(dir, 'LICENSE'), 'utf8')), licenseFromUrl(collection.licenseUrl)],
    declared: source.license,
    commercial: config.APP_COMMERCIAL,
    evalOnly: source.evalOnly,
  });
  log(`License OK: ${source.license} (LICENSE file and collection metadata agree).`);

  // 3–5. extract, tag, chunk: only modules mapped to a topic; the rest are left out.
  const chunks: PackChunk[] = [];
  const unknownTopics = Object.values(pack.topicMap).filter((t) => !gradeOf.has(t));
  if (unknownTopics.length) throw new Error(`topicMap uses codes missing from topics.json: ${unknownTopics.join(', ')}`);
  const mapped = new Set(Object.keys(pack.topicMap));
  collection.chapters.forEach((chapter, ci) => {
    chapter.modules.forEach((moduleId, mi) => {
      if (!mapped.has(moduleId)) return;
      const mod = parseModule(moduleId, readFileSync(join(dir, 'modules', moduleId, 'index.cnxml'), 'utf8'));
      const topic = pack.topicMap[moduleId];
      // OpenStax numbers a chapter's Introduction page 0, then sections 1, 2, …
      const sourceUrl = source.pagesUrl + openstaxSlug(ci + 1, mi, mod.title);
      for (const section of mergeShortSections(mod.sections)) {
        const title = mod.title.includes(section.title) ? mod.title : `${mod.title}: ${section.title}`;
        for (const text of chunkParagraphs(section.paragraphs)) {
          chunks.push({ subject: pack.subject, grade: gradeOf.get(topic) ?? 0, topic, title, text, sourceUrl });
        }
      }
    });
  });
  const missing = [...mapped].filter((m) => !collection.chapters.some((c) => c.modules.includes(m)));
  if (missing.length) throw new Error(`topicMap modules not in ${source.collection}: ${missing.join(', ')}`);

  // 6. write SQLite
  const grades = [...new Set(chunks.map((c) => c.grade))].sort((a, b) => a - b);
  const attribution =
    `Adapted from ${source.title} by ${source.authors} (${source.publisher}), ${source.bookUrl}. ` +
    `Access for free at openstax.org. Licensed ${source.license} (${source.licenseUrl}). ` +
    'Changes: split into short notes; figures, tables and exercises removed.';
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
      // The source commit's date, not the clock: the same book and builder give the same bytes (and sha256).
      built_at: git(dir, 'log', '-1', '--format=%cI'),
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
  const notCovered = [...new Set(Object.values(pack.topicMap))].filter((t) => !perTopic.has(t));
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
