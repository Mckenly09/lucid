export type SubjectId = 'math' | 'science' | 'english' | 'filipino' | 'social' | 'general';

// shortcut: UI fields only; systemPrompt, examples, temperature etc. (subjects.md) come with the LLM layer.
export type Subject = {
  id: SubjectId;
  name: string;
  /** Chip label */
  short: string;
  /** Two-letter tile in History and Library */
  code: string;
};

export const SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', short: 'Math', code: 'MA' },
  { id: 'science', name: 'Science', short: 'Science', code: 'SC' },
  { id: 'english', name: 'English', short: 'English', code: 'EN' },
  { id: 'filipino', name: 'Filipino', short: 'Filipino', code: 'FI' },
  { id: 'social', name: 'Araling Panlipunan', short: 'Araling Panlipunan', code: 'AP' },
  { id: 'general', name: 'General', short: 'General', code: 'GE' },
];

export const subject = (id: SubjectId) => SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[SUBJECTS.length - 1];
