const MAX_CHARS = 200;

/** Turns a chat answer into a card back: the "Answer:" or "Short answer:" part, else the first paragraph, cut at a sentence. */
export function shortenAnswer(answer: string): { text: string; shortened: boolean } {
  const plain = answer
    .replace(/```[\s\S]*?```/g, '')
    // Only formatting marks: a lone * or _ is math (2*3, x_1).
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[#>]+\s*/gm, '')
    .trim();
  const labelled = plain.match(/^\s*(?:\d+\.\s*)?(?:short answer|answer|sagot)\s*:\s*(.+)$/im)?.[1];
  let text = (labelled ?? plain.split(/\n\s*\n/)[0]).replace(/\s+/g, ' ').trim();
  if (text.length > MAX_CHARS) {
    const cut = text.slice(0, MAX_CHARS);
    const end = cut.lastIndexOf('. ');
    text = end > 40 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  }
  return { text, shortened: text !== plain.replace(/\s+/g, ' ').trim() };
}
