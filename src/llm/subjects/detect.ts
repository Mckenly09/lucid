import type { SubjectId } from './config';

// shortcut: keyword lists, no model call (subjects.md). Swap for an on-device embedding model once packs use embeddings.
const KEYWORDS: Record<Exclude<SubjectId, 'general'>, string[]> = {
  math: [
    'solve', 'equation', 'fraction', 'percent', 'percentage', 'area', 'perimeter', 'volume', 'angle', 'triangle',
    'circle', 'radius', 'square root', 'sqrt', 'slope', 'factor', 'factorise', 'factorize', 'polynomial', 'derivative',
    'integral', 'probability', 'mean', 'median', 'mode', 'ratio', 'algebra', 'geometry', 'trigonometry', 'sine', 'cosine',
    'lutasin', 'kabuuan', 'bahagdan',
  ],
  science: [
    'cell', 'cells', 'atom', 'atoms', 'molecule', 'force', 'gravity', 'energy', 'photosynthesis', 'plant', 'plants',
    'animal', 'dna', 'gene', 'genes', 'virus', 'bacteria', 'organ', 'element', 'compound', 'reaction', 'acid', 'base',
    'velocity', 'acceleration', 'mass', 'density', 'electricity', 'magnet', 'planet', 'earthquake', 'volcano', 'weather',
    'climate', 'ecosystem', 'evolution', 'newton', 'chemical', 'biology', 'chemistry', 'physics',
  ],
  social: [
    'history', 'revolution', 'war', 'president', 'government', 'constitution', 'economy', 'economics', 'geography',
    'country', 'colonial', 'colonization', 'spanish', 'katipunan', 'rizal', 'bonifacio', 'aguinaldo', 'martial law',
    'democracy', 'supply', 'demand', 'inflation', 'region', 'province', 'continent', 'kasaysayan', 'pamahalaan',
    'ekonomiya', 'heograpiya', 'rebolusyon', 'bayani',
  ],
  english: [
    'grammar', 'noun', 'pronoun', 'verb', 'adjective', 'adverb', 'tense', 'past tense', 'present perfect', 'sentence',
    'paragraph', 'essay', 'thesis', 'poem', 'novel', 'story', 'theme', 'synonym', 'antonym', 'spelling', 'punctuation',
    'subject-verb', 'figure of speech', 'metaphor', 'simile', 'english',
  ],
  filipino: [
    'pang-uri', 'pangngalan', 'panghalip', 'pandiwa', 'pang-abay', 'pangatnig', 'pang-ukol', 'gramatika', 'panitikan',
    'tula', 'nobela', 'maikling kuwento', 'sanaysay', 'talata', 'pangungusap', 'salita', 'kahulugan', 'tayutay',
    'filipino', 'wika',
  ],
};

/** Common Filipino words: a hint the student wants Filipino, but weaker than any topic word. */
const FILIPINO_FUNCTION_WORDS = /\b(ang|ng|mga|sa|ay|ano|bakit|paano|ito|iyan|po)\b/;
/** "3 + 4", "x = 5", "2x". */
const MATH_PATTERN = /\d\s*[-+*/×÷^=]\s*\d|\b[a-z]\s*=\s*-?\d|\d[a-z]\b/;

/** True when most sentences read as Filipino; picks which language chip to offer under an answer. */
export function isFilipino(text: string) {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const hits = words.filter((w) => FILIPINO_FUNCTION_WORDS.test(w)).length;
  return words.length > 0 && hits / words.length >= 0.08;
}

const ORDER: Exclude<SubjectId, 'general'>[] = ['math', 'science', 'social', 'english', 'filipino'];

// No "-": it's literal outside a class, and "\-" is invalid with the u flag.
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = Object.fromEntries(
  ORDER.map((id) => [id, KEYWORDS[id].map((w) => new RegExp(`(^|[^\\p{L}])${escape(w)}($|[^\\p{L}])`, 'u'))]),
) as Record<Exclude<SubjectId, 'general'>, RegExp[]>;

/** Best-guess subject for a question; `general` when nothing matches. Ties go to the earlier subject in ORDER. */
export function detectSubject(question: string): SubjectId {
  const q = question.toLowerCase();
  let best: SubjectId = 'general';
  let bestScore = 0;
  for (const id of ORDER) {
    let score = PATTERNS[id].filter((re) => re.test(q)).length;
    if (id === 'math' && MATH_PATTERN.test(q)) score += 2;
    if (id === 'filipino' && FILIPINO_FUNCTION_WORDS.test(q)) score += 0.5;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
