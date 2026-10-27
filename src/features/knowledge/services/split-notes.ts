/** Longest note made from an imported file; longer sections are cut at paragraphs, so each note is one search hit. */
export const NOTE_MAX_WORDS = 300;
export const NOTE_MAX_CHARS = 5000;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * An imported .txt or .md file → notes. Markdown headings (#, ##, …) start a new note titled by the heading;
 * text before the first heading is titled by the file name. Long sections become "Title (2)", "Title (3)"…
 */
export function splitNotes(content: string, fileName: string): { title: string; text: string }[] {
  const fallback = fileName.replace(/\.(md|markdown|txt)$/i, '').trim() || 'Notes';
  const sections: { title: string; lines: string[] }[] = [{ title: fallback, lines: [] }];
  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (heading) sections.push({ title: heading[1].trim(), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }

  const notes: { title: string; text: string }[] = [];
  for (const s of sections) {
    const paragraphs = s.lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const parts: string[] = [];
    let cur = '';
    for (const p of paragraphs) {
      if (cur && words(`${cur} ${p}`) > NOTE_MAX_WORDS) {
        parts.push(cur);
        cur = '';
      }
      cur = cur ? `${cur}\n\n${p}` : p;
    }
    if (cur) parts.push(cur);
    parts.forEach((text, i) =>
      notes.push({ title: (i ? `${s.title} (${i + 1})` : s.title).slice(0, 120), text: text.slice(0, NOTE_MAX_CHARS) }),
    );
  }
  return notes;
}
