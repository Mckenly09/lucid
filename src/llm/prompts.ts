import type { Turn } from './engine';
import { subject, type SubjectId } from './subjects/config';

// Copied from docs/subjects.md "Shared rules"; edit it there first.
export const SHARED_RULES = `You are Lucid, a patient high school tutor. You run offline on the student's phone.
- Answer in the same language the student uses (English, Filipino, or Taglish).
- Use simple words. Explain like a good teacher, not a textbook.
- Keep answers short: under 200 words unless the student asks for more.
- If you are not sure, say "I'm not sure" and suggest checking the textbook or teacher. Never make up facts, dates, names, or formulas.
- If reference notes are provided, base your answer on them.
- For homework, teach the method. Don't just give the final answer without explaining it.`;

/** Earlier messages kept (2 = the last question and answer); small models drift with long history. */
export const HISTORY_TURNS = 4;
/** ~400 tokens of reference notes at ~4 characters per token (subjects.md). */
export const NOTES_MAX_CHARS = 1600;

/** Rough count for budgets only; the real tokenizer lives in the runtime. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/** Settings → Answer language; "same" keeps the shared rule (answer in the student's language). */
export type AnswerLanguage = 'same' | 'english' | 'filipino';
const LANGUAGE_RULE: Record<AnswerLanguage, string> = {
  same: '',
  english: '\n\nAlways answer in English, even if the question is in Filipino.',
  filipino: '\n\nLaging sumagot sa Filipino, kahit nasa English ang tanong.',
};

export const systemPrompt = (id: SubjectId, language: AnswerLanguage = 'same') =>
  `${SHARED_RULES}\n\n${subject(id).systemPrompt}${LANGUAGE_RULE[language]}`;

export type ExplainKind = 'simpler' | 'example' | 'filipino' | 'english';

/** What the student sees as their message; the model gets EXPLAIN_ASK instead. */
export const EXPLAIN_LABEL: Record<ExplainKind, string> = {
  simpler: 'Explain simpler',
  example: 'Give an example',
  filipino: 'In Filipino',
  english: 'In English',
};

const EXPLAIN_ASK: Record<ExplainKind, string> = {
  simpler: 'Explain this again more simply, for a younger student. Use short sentences and everyday words.',
  example: 'Give one new example like this, worked out step by step.',
  filipino: 'Ipaliwanag ito sa Filipino. Panatilihin ang parehong mga hakbang at sagot.',
  english: 'Explain this in English. Keep the same steps and answer.',
};

/** A follow-up on the last answer only, so the prompt stays small (roadmap "Explain levels"). */
export function buildExplainPrompt(opts: { subjectId: SubjectId; kind: ExplainKind; lastAnswer: string }) {
  const s = subject(opts.subjectId);
  // One user turn holding the answer: some chat templates reject a conversation that starts with the assistant.
  const content = `Here is an explanation:\n${opts.lastAnswer.trim()}\n\n${EXPLAIN_ASK[opts.kind]}`;
  return { system: systemPrompt(s.id), turns: [{ role: 'user', content } satisfies Turn], temperature: s.temperature };
}

export function buildPrompt(opts: {
  subjectId: SubjectId;
  question: string;
  /** Earlier messages in this chat, oldest first. */
  history?: Turn[];
  /** Knowledge-pack passages, best match first. */
  notes?: string[];
  language?: AnswerLanguage;
}) {
  const s = subject(opts.subjectId);
  const notes = (opts.notes ?? []).join('\n\n').slice(0, NOTES_MAX_CHARS).trim();
  const question = opts.question.trim();
  const content = notes ? `Reference notes:\n${notes}\n\nQuestion: ${question}` : question;
  return {
    system: systemPrompt(s.id, opts.language),
    turns: [...(opts.history ?? []).slice(-HISTORY_TURNS), { role: 'user', content } satisfies Turn],
    temperature: s.temperature,
  };
}

// Copied from docs/subjects.md "Quiz me"; edit it there first. Kept short: it replaces the subject prompt.
const QUIZ_RULES = `You write multiple-choice quiz questions for a high school student.
- Use only facts from the explanation you are given. Do not add new facts.
- Write in the same language as the explanation.
- Each question has one correct answer and three wrong answers that are clearly wrong but believable.
- "why" is one short sentence explaining the correct answer.
- Reply with JSON only.`;

/** Answers longer than this are cut so the prompt fits the 2048-token context with room for the quiz. */
export const QUIZ_ANSWER_MAX_CHARS = 2400;

/** The model returns the right answer and the wrong ones apart; code shuffles them, so "exactly one correct" holds by shape. */
export const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          wrong: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
          why: { type: 'string' },
        },
        required: ['question', 'answer', 'wrong', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

/** Quiz me: 3 questions (the schema allows up to 5) to stay near the ~10 s target. Built from the answer text only, so questions stay on what the student just learned (roadmap v1). */
export function buildQuizPrompt(answer: string) {
  const content = `Explanation:\n${answer.trim().slice(0, QUIZ_ANSWER_MAX_CHARS)}\n\nWrite 3 short questions about this explanation.`;
  return { system: QUIZ_RULES, turns: [{ role: 'user', content } satisfies Turn], jsonSchema: QUIZ_SCHEMA, maxTokens: 600 };
}
