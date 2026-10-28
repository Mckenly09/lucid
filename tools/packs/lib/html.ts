// Government web pages (USGS, NOAA, NASA, PHIVOLCS, PAGASA) → sections, like an OpenStax module (docs/packs.md §3).
import type { Module, Section } from './cnxml.ts';

/** Never content: page chrome, media and forms. Skipped with everything inside them. */
const DROP_TAGS = new Set([
  'nav', 'header', 'footer', 'aside', 'form', 'button', 'select', 'figure', 'figcaption', 'img', 'picture', 'video',
  'audio', 'iframe', 'svg', 'map', 'dialog',
]);
/** class / id words of menus, share bars, sidebars and other chrome around the article. */
const CHROME = new Set([
  'menu', 'navbar', 'nav', 'navigation', 'breadcrumb', 'breadcrumbs', 'share', 'sharing', 'social', 'sidebar', 'footer',
  'header', 'related', 'cookie', 'skip', 'search', 'modal', 'banner', 'comments', 'pagination', 'sr', 'visually', 'caption',
  'credit', 'toc', 'notification',
]);
/** Wrappers named after chrome but holding the article: "non-sidebar-content", "not-navigation", "fixed-sidebar". */
const WRAPPER = new Set(['content', 'main', 'body', 'no', 'non', 'not', 'with', 'has', 'fixed', 'wrapper', 'container', 'article', 'entry', 'page', 'layout']);
/** A class/id token like "site-footer" or "breadcrumbs" marks chrome; one with a wrapper part doesn't. */
const isChrome = (names: string) =>
  names.split(/\s+/).some((token) => {
    const parts = token.toLowerCase().split(/[-_]+/);
    return parts.some((p) => CHROME.has(p)) && !parts.some((p) => WRAPPER.has(p));
  });
const VOID = new Set(['br', 'hr', 'img', 'meta', 'link', 'input', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'track']);
const BLOCK = new Set([
  'p', 'div', 'section', 'article', 'main', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'center',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'table', 'tr',
]);
/** Site boilerplate that sits inside the content area. */
const BOILERPLATE = [
  /Web Content Accessibility Guidelines/i, /^back to top$/i, /^share( this)?:?$/i, /^print$/i, /^skip to/i,
  /^U\.S\. Department of the Interior \|/, /^Return to USGS/i, /^This page is https?:/i,
];

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', hellip: '…', deg: '°', middot: '·', times: '×', minus: '−', plusmn: '±', sup2: '²', sup3: '³',
  frac12: '½', frac14: '¼', frac34: '¾', micro: 'µ', ntilde: 'ñ', Ntilde: 'Ñ', eacute: 'é', copy: '©', reg: '®',
};
const decode = (s: string) =>
  s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(e[1] === 'x' || e[1] === 'X' ? 2 : 1), e[1] === 'x' || e[1] === 'X' ? 16 : 10)) : (ENTITIES[e] ?? m),
  );
const clean = (s: string) =>
  decode(s).replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/(;\s*)+;/g, ';').replace(/^[;\s]+|[;\s]+$/g, '').trim();

/** The page's main content: <main>, else <article>, else <body>, else everything. */
function region(html: string) {
  for (const tag of ['main', 'article', 'body']) {
    const start = html.search(new RegExp(`<${tag}\\b`, 'i'));
    if (start >= 0) {
      const end = html.toLowerCase().lastIndexOf(`</${tag}>`);
      return html.slice(start, end > start ? end : undefined);
    }
  }
  return html;
}

export type PageOptions = {
  /** Note title when the page's own is just the site name ("PAGASA"). */
  title?: string;
  /** Keep text from here on (drops leftovers above the article, even inside the same block). */
  start?: string;
  /** Stop before the first paragraph containing this (drops "Related pages", reference lists…). */
  end?: string;
};

/** One web page → title and sections: headings start sections, blocks become paragraphs, list items "- …". */
export function parseHtml(id: string, html: string, opts: PageOptions = {}): Module {
  const raw = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, '');
  const pageTitle = clean((raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? id).split(/\s[|–-]\s/)[0]);

  type Block = { heading: boolean; text: string };
  const blocks: Block[] = [];
  let text = '';
  let listItem = false;
  const flush = (heading = false) => {
    const t = clean(text);
    if (t) blocks.push({ heading, text: listItem && !heading ? `- ${t}` : t });
    text = '';
    listItem = false;
  };

  const skip: string[] = []; // open dropped elements; text inside is ignored
  let row = 0; // inside a table row
  for (const m of region(raw).matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
    const [, close, rawTag, attrs, chunk] = m;
    if (chunk !== undefined) {
      if (!skip.length) text += chunk;
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (skip.length) {
      if (VOID.has(tag) || attrs.endsWith('/')) continue;
      // HTML may leave <li> and <p> unclosed: a closing tag unwinds to its own opening tag.
      if (close) {
        const at = skip.lastIndexOf(tag);
        if (at >= 0) skip.length = at;
      } else skip.push(tag);
      continue;
    }
    const classes = [...attrs.matchAll(/\b(?:class|id|role)\s*=\s*["']([^"']*)["']/gi)].map((a) => a[1]).join(' ');
    if (!close && !VOID.has(tag) && !attrs.endsWith('/') && (DROP_TAGS.has(tag) || isChrome(classes) || /aria-hidden=["']true/i.test(attrs))) {
      skip.push(tag);
      continue;
    }
    if (tag === 'sup' && !close) text += '^';
    // A table row reads as one line ("I; Scarcely Perceptible; Perceptible to people…"), whatever its cells hold.
    if (tag === 'tr') {
      row += close ? -1 : 1;
      flush();
      continue;
    }
    if (row > 0) {
      if ((tag === 'td' || tag === 'th') && close) text += '; ';
      else if (BLOCK.has(tag) || tag === 'br') text += ' ';
      continue;
    }
    if (tag === 'br') text += /[.:!?]\s*$/.test(text) ? '\n\n' : ' ';
    if (text.includes('\n\n')) flush();
    if (BLOCK.has(tag)) flush(!!close && /^h[1-6]$/.test(tag));
    if (tag === 'li' && !close) listItem = true;
  }
  flush();

  // Trim to the article, drop boilerplate and crumbs (a line of under four words that isn't a heading or a label).
  let kept = blocks.filter((b) => !BOILERPLATE.some((re) => re.test(b.text)));
  const from = opts.start ? kept.findIndex((b) => b.text.includes(opts.start as string)) : 0;
  if (from < 0) throw new Error(`${id}: start marker not found: "${opts.start}"`);
  kept = kept.slice(from);
  if (opts.start) kept[0] = { ...kept[0], text: kept[0].text.slice(kept[0].text.indexOf(opts.start)) };
  const to = opts.end ? kept.findIndex((b) => b.text.includes(opts.end as string)) : -1;
  if (opts.end && to < 0) throw new Error(`${id}: end marker not found: "${opts.end}"`);
  if (to >= 0) kept = kept.slice(0, to);
  kept = kept.filter((b) => b.heading || b.text.endsWith(':') || b.text.split(' ').length >= 4);

  const firstHeading = kept.find((b) => b.heading)?.text;
  const title = opts.title ?? (firstHeading && pageTitle.includes(firstHeading) ? firstHeading : pageTitle);
  const sections: Section[] = [{ title, paragraphs: [] }];
  for (const b of kept) {
    if (b.heading) {
      if (b.text !== title) sections.push({ title: b.text, paragraphs: [] });
    } else sections[sections.length - 1].paragraphs.push(b.text);
  }
  return { id, title, sections: sections.filter((s) => s.paragraphs.length) };
}
