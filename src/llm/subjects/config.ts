export type SubjectId = 'math' | 'science' | 'english' | 'filipino' | 'social' | 'general';

// shortcut: no few-shot `examples` or `knowledgePackIds` yet (subjects.md); add them with the eval set and packs.
export type Subject = {
  id: SubjectId;
  name: string;
  /** Chip label */
  short: string;
  /** Two-letter tile in History and Library */
  code: string;
  /** Wording copied from docs/subjects.md; edit it there first. */
  systemPrompt: string;
  temperature: number;
  usesCalculator: boolean;
};

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    short: 'Math',
    code: 'MA',
    systemPrompt: `Subject: Mathematics.
Format:
1. Given: what we know.
2. Steps: one step per line, show the operation.
3. Answer: the final answer on its own line.
4. Check: plug the answer back in or estimate.
Write math in plain text (x^2, sqrt(9), 3/4). Include units if the problem has them.
The final answer must be numbers, not an expression like x = 5 - 2y.
If given a verified solution, explain it and keep its numbers.`,
    temperature: 0.1,
    usesCalculator: true,
  },
  {
    id: 'science',
    name: 'Science',
    short: 'Science',
    code: 'SC',
    systemPrompt: `Subject: Science (biology, chemistry, physics, earth science).
Format:
1. Short answer in one or two sentences.
2. Explanation of the concept.
3. Example from everyday life.
For problems: list the formula, the values with units, then solve step by step.`,
    temperature: 0.2,
    usesCalculator: true,
  },
  {
    id: 'english',
    name: 'English',
    short: 'English',
    code: 'EN',
    systemPrompt: `Subject: English.
For grammar: state the rule, give a correct example, then fix the student's sentence if they gave one.
For reading or literature: answer the question, then point to the part of the text that supports it.
For writing: help with an outline, thesis, or feedback. Do not write the full essay for the student.`,
    temperature: 0.4,
    usesCalculator: false,
  },
  {
    id: 'filipino',
    name: 'Filipino',
    short: 'Filipino',
    code: 'FI',
    // Needs a review by a fluent Filipino teacher (subjects.md).
    systemPrompt: `Asignatura: Filipino.
Sumagot sa Filipino.
Para sa gramatika: ibigay ang tuntunin, halimbawa, at itama ang pangungusap kung mayroon.
Para sa panitikan at pagbasa: sagutin ang tanong at ituro ang bahagi ng teksto na sumusuporta rito.
Sa pagsulat: tumulong sa balangkas at puna. Huwag isulat ang buong sanaysay para sa estudyante.`,
    temperature: 0.4,
    usesCalculator: false,
  },
  {
    id: 'social',
    name: 'Araling Panlipunan',
    short: 'Araling Panlipunan',
    code: 'AP',
    systemPrompt: `Subject: Araling Panlipunan / Social Studies (history, geography, economics, government).
Format:
1. Direct answer.
2. Key details: who, what, when, where.
3. Why it matters: causes and effects.
Only state dates and names you are sure of. If reference notes are given, use them.`,
    temperature: 0.3,
    usesCalculator: false,
  },
  {
    id: 'general',
    name: 'General',
    short: 'General',
    code: 'GE',
    systemPrompt: `Subject: General.
Give a short, clear explanation with one example.`,
    temperature: 0.4,
    usesCalculator: false,
  },
];

export const subject = (id: SubjectId) => SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[SUBJECTS.length - 1];
