// shortcut: static demo content so the screens render before SQLite, the LLM and pack downloads exist.
// Replace each export with its feature's real hook/query, then delete this file.
import type { SubjectId } from '@/llm/subjects/config';

export const SUGGESTIONS: { subject: SubjectId; q: string }[] = [
  { subject: 'math', q: 'Solve 2x + 5 = 17' },
  { subject: 'science', q: 'Why do plants need sunlight?' },
  { subject: 'filipino', q: 'Ano ang pang-uri?' },
];

export const DEMO_CHAT = {
  title: 'Linear equation',
  subject: 'math' as SubjectId,
  question: 'Solve 2x + 5 = 17',
  answer: `#### Given
2x + 5 = 17. We need to find x.

#### Steps
1. Subtract 5 from both sides

\`\`\`
2x = 17 − 5 = 12
\`\`\`

2. Divide both sides by 2

\`\`\`
x = 12 ÷ 2 = 6
\`\`\`
`,
  finalAnswer: 'x = 6',
  checked: true,
  check: '2(6) + 5 = 12 + 5 = 17 ✓',
  source: 'Math pack · Linear equations',
};

export type QuizQuestion = { question: string; choices: string[]; correct: number; why: string };

export const DEMO_QUIZ: { topic: string; questions: QuizQuestion[] } = {
  topic: 'Linear equations',
  questions: [
    {
      question: 'What is x if 2x + 5 = 17?',
      choices: ['x = 11', 'x = 6', 'x = 8.5', 'x = 12'],
      correct: 1,
      why: 'Subtract 5 to get 2x = 12, then divide by 2: x = 6.',
    },
    {
      question: 'What is the first step to solve 3x − 4 = 11?',
      choices: ['Divide both sides by 3', 'Add 4 to both sides', 'Subtract 11 from both sides', 'Multiply both sides by 3'],
      correct: 1,
      why: 'Undo the − 4 first: 3x = 15. Then divide by 3 to get x = 5.',
    },
    {
      question: 'Which value makes x − 7 = 3 true?',
      choices: ['x = −4', 'x = 4', 'x = 10', 'x = 21'],
      correct: 2,
      why: 'Add 7 to both sides: x = 10.',
    },
    {
      question: 'Solve 5x = 35.',
      choices: ['x = 7', 'x = 30', 'x = 40', 'x = 175'],
      correct: 0,
      why: 'Divide both sides by 5: x = 7.',
    },
  ],
};

export type FlashCard = { id: string; subject: SubjectId; topic: string; front: string; back: string };

export const DEMO_CARDS: FlashCard[] = [
  {
    id: 'c1',
    subject: 'filipino',
    topic: 'Gramatika',
    front: 'Ano ang pang-uri? Magbigay ng halimbawa.',
    back: 'Salitang naglalarawan sa pangngalan o panghalip. Halimbawa: maganda, matangkad.',
  },
  { id: 'c2', subject: 'math', topic: 'Linear equations', front: 'Solve 3x − 4 = 11', back: 'x = 5' },
  {
    id: 'c3',
    subject: 'science',
    topic: 'Photosynthesis',
    front: 'What do plants make using sunlight?',
    back: 'Glucose (food) and oxygen, from carbon dioxide and water.',
  },
];

export type HistoryItem = { id: string; subject: SubjectId; question: string; preview: string; time: string; group: string };

export const DEMO_HISTORY: HistoryItem[] = [
  { id: 'h1', group: 'Today', subject: 'math', question: 'Solve 2x + 5 = 17', preview: 'Subtract 5 from both sides, then divide by 2…', time: '9:41' },
  { id: 'h2', group: 'Today', subject: 'science', question: 'Why do plants need sunlight?', preview: 'Plants use light energy to make food through…', time: '8:15' },
  { id: 'h3', group: 'Yesterday', subject: 'filipino', question: 'Ano ang pang-uri?', preview: 'Ang pang-uri ay salitang naglalarawan sa…', time: 'Mon' },
  { id: 'h4', group: 'Yesterday', subject: 'english', question: 'Simple past vs present perfect', preview: 'Use simple past for finished actions with a…', time: 'Mon' },
  { id: 'h5', group: 'Yesterday', subject: 'social', question: 'Causes of the Philippine Revolution', preview: 'Direct answer, key details, why it matters…', time: 'Mon' },
  { id: 'h6', group: 'This week', subject: 'math', question: 'Area of a circle with r = 7 cm', preview: 'A = πr², so A = π × 49 ≈ 153.94 cm²', time: 'Sat' },
  { id: 'h7', group: 'This week', subject: 'science', question: "Newton's second law example", preview: 'F = ma. A 2 kg ball pushed with…', time: 'Fri' },
];

export type PackStatus = 'installed' | 'update' | 'failed' | 'available';

export const DEMO_PACKS: { subject: SubjectId; detail: string; sizeMB: number; status: PackStatus }[] = [
  { subject: 'math', detail: 'Grades 7–10', sizeMB: 42, status: 'installed' },
  { subject: 'science', detail: 'Grades 7–10', sizeMB: 38, status: 'installed' },
  { subject: 'filipino', detail: 'New version available', sizeMB: 30, status: 'update' },
  { subject: 'social', detail: 'Download stopped', sizeMB: 35, status: 'failed' },
  { subject: 'english', detail: 'Grades 7–10', sizeMB: 33, status: 'available' },
];

export const DEMO_MODELS = [
  { id: 'lite', name: 'Lucid Lite', description: 'Fast · best for most phones', sizeMB: 1000, minRamGB: 3 },
  { id: 'plus', name: 'Lucid Plus', description: 'Smarter answers · slower', sizeMB: 2300, minRamGB: 6 },
];
