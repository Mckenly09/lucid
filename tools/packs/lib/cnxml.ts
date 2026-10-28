// OpenStax CNXML → plain text by section (docs/packs.md §3 "extract").
import { XMLParser } from 'fast-xml-parser';

export type Section = { title: string; paragraphs: string[] };
export type Module = { id: string; title: string; sections: Section[] };
export type Chapter = { title: string; modules: string[] };

// preserveOrder keeps text and tags in document order, which prose needs.
type XmlNode = Record<string, unknown>;
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  processEntities: true,
  htmlEntities: true,
});

const tagOf = (n: XmlNode) => Object.keys(n).find((k) => k !== ':@') ?? '';
const kids = (n: XmlNode) => (Array.isArray(n[tagOf(n)]) ? (n[tagOf(n)] as XmlNode[]) : []);
const attr = (n: XmlNode, name: string) => ((n[':@'] as Record<string, string> | undefined)?.[name] ?? '');
const find = (nodes: XmlNode[], tag: string) => nodes.find((n) => tagOf(n) === tag);

/** Not prose, or not for students reading offline: images, tables, practice problems, glossary, web links. */
const DROP_TAGS = new Set(['figure', 'media', 'image', 'table', 'glossary', 'footnote', 'metadata', 'caption']);
// Exercises and review questions, teacher-only notes (os-teacher, ost-*), links to videos/simulations, figure prompts.
const DROP_CLASSES = new RegExp(
  `\\b(${[
    'exercises', 'key-equations', 'link-to-learning', 'chemist-portrait', 'teacher', 'ost-[\\w-]+', 'learning-objectives',
    'short-answer', 'critical-thinking', 'extended-response', 'free-response', 'multiple-choice', 'concept',
    'check-understanding', 'practice-problems', 'problems', 'performance', 'review', 'watch-physics', 'snap-lab',
    'virtual-physics', 'interactive', 'visual-connection', 'visual-exercise', 'art-exercise', 'ap-[\\w-]+', 'career',
    'keyterms', 'References', 'sr-contrib-auth', 'be-prepared',
  ].join('|')})\\b`,
);
const SPACED_OPS = new Set(['=', '+', '−', '-', '×', '⟶', '→', '⇌', '<', '>', '≤', '≥', '≈']);

// One number or one letter stands alone; anything longer gets brackets, so /(2a) and ^(2n) can't be misread.
const wrap = (s: string) => (/^(\d+(\.\d+)?|\p{L})$/u.test(s) ? s : `(${s})`);

/**
 * MathML → plain text the model reads well: x^2, sqrt(9), cbrt(8), nthRoot(x, 4), 3/4 (docs/packs.md; root names as in
 * mathjs). Subscripts stay inline (H2O). Outside an exponent, a power or fraction ends with a space so what follows
 * isn't read as part of it: a^m b^m, 1/2 mv^2.
 */
function math(nodes: XmlNode[], tight = false): string {
  return nodes
    .map((n) => {
      const tag = tagOf(n);
      if (tag === '#text') return String(n['#text']);
      // Pretty-printed MathML (Physics) has whitespace between elements; base/exponent and numerator/denominator are
      // the element children, so whitespace-only text must not take their places.
      const c = kids(n).filter((x) => tagOf(x) !== '#text' || String(x['#text']).trim() !== '');
      const each = () => c.map((x) => math([x], tight));
      switch (tag) {
        case 'm:mo': {
          const op = math(c, true).trim();
          return !tight && SPACED_OPS.has(op) ? ` ${op} ` : op;
        }
        case 'm:mspace':
          return ' ';
        case 'm:msup': {
          const [base, sup] = c.map((x) => math([x], true));
          return `${base}^${wrap(sup ?? '')}${tight ? '' : ' '}`;
        }
        case 'm:msub': {
          const [base, sub] = each();
          return `${base}${sub ?? ''}`;
        }
        case 'm:msubsup': {
          const [base, sub, sup] = c.map((x) => math([x], true));
          return `${base}${sub ?? ''}^${wrap(sup ?? '')}`;
        }
        case 'm:mfrac': {
          const [num, den] = each();
          return `${wrap((num ?? '').trim())}/${wrap((den ?? '').trim())}${tight ? '' : ' '}`;
        }
        case 'm:mroot': {
          const [radicand, index] = each().map((s) => s.trim());
          return index === '3' ? `cbrt(${radicand})` : `nthRoot(${radicand}, ${index})`;
        }
        case 'm:msqrt':
          return `sqrt(${math(c).trim()})`;
        case 'm:mtr':
          return `${each().join(' ').trim()}; `;
        case 'm:mphantom':
        case 'm:annotation':
          return '';
        default:
          return math(c, tight);
      }
    })
    .join('');
}

/** Running text inside a paragraph: terms, emphasis, sub/sup, inline math and links all become plain text. */
function inline(nodes: XmlNode[]): string {
  return nodes
    .map((n) => {
      const tag = tagOf(n);
      if (tag === '#text') return String(n['#text']);
      if (DROP_TAGS.has(tag)) return '';
      if (tag === 'm:math') return math(kids(n));
      if (tag === 'sup') return `^${inline(kids(n))}`;
      if (tag === 'newline') return ' ';
      if (tag === 'item') return ` ${inline(kids(n))};`;
      return inline(kids(n));
    })
    .join('');
}

export const clean = (s: string) =>
  s
    .replace(/\(\s*\)/g, '') // empty "(Figure)" links
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/;\s*$/, '')
    .trim();

/** Worked examples: Chemistry uses <example>, Physics a "worked-example" note wrapping an <exercise>. */
const isExample = (n: XmlNode) => tagOf(n) === 'example' || attr(n, 'class').split(' ').includes('worked-example');

/**
 * Block-level content → paragraphs. Worked examples are kept (docs/packs.md); any other <exercise> is a practice
 * problem and dropped.
 */
function blocks(nodes: XmlNode[], out: string[], inExample = false) {
  for (const n of nodes) {
    const tag = tagOf(n);
    if (tag === '#text' || DROP_TAGS.has(tag) || DROP_CLASSES.test(attr(n, 'class'))) continue;
    if (tag === 'exercise' && !inExample) continue;
    // Math books draw worked solutions as images in a table: a problem whose solutions have no text is just noise.
    const solutions = tag === 'exercise' ? kids(n).filter((x) => tagOf(x) === 'solution') : [];
    if (solutions.length && !solutions.some((s) => hasText(kids(s)))) continue;
    if (tag === 'para' || tag === 'equation' || tag === 'title') {
      const text = clean(inline(kids(n)));
      if (text) out.push(tag === 'title' ? `${text}:` : text);
    } else if (tag === 'list') {
      for (const item of kids(n).filter((x) => tagOf(x) === 'item')) {
        const text = clean(inline(kids(item)));
        if (text) out.push(`- ${text}`);
      }
    } else if (tag !== 'section') {
      blocks(kids(n), out, inExample || isExample(n));
    }
  }
}

/** True when a block has prose besides its own title ("Solution:"). */
function hasText(nodes: XmlNode[]) {
  const out: string[] = [];
  blocks(nodes.filter((x) => tagOf(x) !== 'title'), out, true);
  return out.length > 0;
}

/** Sections in reading order; text before the first section belongs to the module title. Empty sections are dropped. */
function sections(nodes: XmlNode[], title: string, out: Section[]) {
  const intro: string[] = [];
  // The section's own <title> is its heading, not a paragraph.
  blocks(nodes.filter((n) => tagOf(n) !== 'title'), intro);
  if (intro.length) out.push({ title, paragraphs: intro });
  for (const s of nodes.filter((n) => tagOf(n) === 'section' && !DROP_CLASSES.test(attr(n, 'class')))) {
    const t = find(kids(s), 'title');
    sections(kids(s), t ? clean(inline(kids(t))) : title, out);
  }
}

export function parseModule(id: string, xml: string): Module {
  const doc = find(parser.parse(xml) as XmlNode[], 'document');
  if (!doc) throw new Error(`${id}: no <document>`);
  const titleNode = find(kids(doc), 'title');
  const title = titleNode ? clean(inline(kids(titleNode))) : id;
  const content = find(kids(doc), 'content');
  const out: Section[] = [];
  if (content) sections(kids(content), title, out);
  return { id, title, sections: out };
}

/** The book's chapters (subcollections) with their module ids in order, plus the license URL it declares. */
export function parseCollection(xml: string): { title: string; licenseUrl: string; chapters: Chapter[] } {
  const root = find(parser.parse(xml) as XmlNode[], 'col:collection');
  if (!root) throw new Error('no <col:collection>');
  const meta = find(kids(root), 'metadata');
  const text = (n?: XmlNode) => (n ? clean(inline(kids(n))) : '');
  const chapters: Chapter[] = [];
  const walk = (nodes: XmlNode[], chapter: Chapter | null) => {
    for (const n of nodes) {
      const tag = tagOf(n);
      if (tag === 'col:module' && chapter) chapter.modules.push(attr(n, 'document'));
      else if (tag === 'col:subcollection') {
        const next = { title: text(find(kids(n), 'md:title')), modules: [] };
        chapters.push(next);
        walk(kids(n), next);
      } else if (tag === 'col:content') walk(kids(n), chapter);
    }
  };
  walk(kids(root), null);
  return {
    title: text(meta && find(kids(meta), 'md:title')),
    licenseUrl: meta ? attr(find(kids(meta), 'md:license') ?? {}, 'url') : '',
    // Units (subcollections holding only chapters) aren't chapters: OpenStax numbers chapters only.
    chapters: chapters.filter((c) => c.modules.length > 0),
  };
}
