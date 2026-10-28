// Our own notes (docs/packs.md §2: English, Filipino) → sections, like an OpenStax module. One file = one topic.
import type { Module, Section } from './cnxml.ts';

/** Inline Markdown → plain text the model reads: **bold**, *italics* and `code` lose their marks, links keep their text. */
const plain = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(?<!\w)(\*\*|__|\*|_|`)(\S(?:.*?\S)?)\1(?!\w)/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * `# Title` names the note, each `## Heading` starts a section, blank lines split paragraphs, `- ` and `1. ` lines stay
 * list items. Text before the first `##` belongs to the title. HTML comments (notes to reviewers) are dropped.
 */
export function parseMarkdown(id: string, md: string): Module {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const title = plain(lines.find((l) => /^# /.test(l))?.slice(2) ?? id);
  const sections: Section[] = [{ title, paragraphs: [] }];
  let para: string[] = [];
  const flush = () => {
    if (para.length) sections[sections.length - 1].paragraphs.push(plain(para.join(' ')));
    para = [];
  };
  for (const line of lines) {
    if (/^# /.test(line)) continue;
    const heading = line.match(/^#{2,}\s+(.*)/);
    if (heading) {
      flush();
      sections.push({ title: plain(heading[1]), paragraphs: [] });
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush();
      // Numbered steps keep their number ("2. Look for…"); bullets become "- ".
      sections[sections.length - 1].paragraphs.push(plain(line.replace(/^\s*[-*]\s+/, '- ')));
    } else if (!line.trim()) flush();
    else para.push(line);
  }
  flush();
  return { id, title, sections: sections.filter((s) => s.paragraphs.length) };
}
