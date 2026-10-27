// Example questions for Ask and the first-time Home.
import type { SubjectId } from '@/llm/subjects/config';

export const SUGGESTIONS: { subject: SubjectId; q: string }[] = [
  { subject: 'math', q: 'Solve 2x + 5 = 17' },
  { subject: 'science', q: 'Why do plants need sunlight?' },
  { subject: 'filipino', q: 'Ano ang pang-uri?' },
];
