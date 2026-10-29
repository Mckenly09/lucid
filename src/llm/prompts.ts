import type { Turn } from './engine';
import { subject, type SubjectId } from './subjects/config';
import { solveLinearSystem } from './subjects/linear';

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
/**
 * Past answers kept in history are cut to this (~150 tokens). The runtime re-reads the whole history before each
 * new answer, so full-length answers made follow-ups slow on low-end phones; the start is enough for context.
 */
export const HISTORY_ANSWER_MAX_CHARS = 600;
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
  // The solver does the algebra; the model only explains it (subjects.md "Equation solver").
  const solution = s.usesCalculator ? solveLinearSystem(question) : null;
  const verified = solution ? `Verified solution (exact, from the calculator):\n${solution.steps}` : '';
  const context = [notes && `Reference notes:\n${notes}`, verified].filter(Boolean).join('\n\n');
  const content = context ? `${context}\n\nQuestion: ${question}` : question;
  return {
    ...(solution && { solution }),
    system: systemPrompt(s.id, opts.language),
    turns: [
      ...(opts.history ?? []).slice(-HISTORY_TURNS).map((t) =>
        t.role === 'assistant' && t.content.length > HISTORY_ANSWER_MAX_CHARS
          ? { ...t, content: `${t.content.slice(0, HISTORY_ANSWER_MAX_CHARS).trimEnd()}…` }
          : t,
      ),
      { role: 'user', content } satisfies Turn,
    ],
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

/** A first, cheap cut on very long answers; QUIZ_ANSWER_MAX_TOKENS is the real fit. */
export const QUIZ_ANSWER_MAX_CHARS = 2400;
/** 2048-token context = ~150 rules and template + this answer + QUIZ_MAX_TOKENS. Filipino and math take more tokens per character, so chars alone overflow. */
export const QUIZ_ANSWER_MAX_TOKENS = 950;
/** Fits QUIZ_COUNT questions at their schema maxLength even in Filipino (~3 chars/token), so the JSON is never cut off. */
const QUIZ_MAX_TOKENS = 850;
/** Questions asked for; one more than the 3 shown at least, so one bad question doesn't fail the quiz. The loading screen counts against it. */
export const QUIZ_COUNT = 4;
/** Shorter answers rarely hold 3 facts to ask about, so the quiz is turned off instead of failing after ~10 s. */
export const QUIZ_MIN_WORDS = 40;
export const canQuiz = (answer: string) => answer.trim().split(/\s+/).length >= QUIZ_MIN_WORDS;

/** The model returns the right answer and the wrong ones apart; code shuffles them, so "exactly one correct" holds by shape. */
export const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: QUIZ_COUNT,
      maxItems: QUIZ_COUNT,
      items: {
        type: 'object',
        properties: {
          // Length caps keep the whole quiz inside QUIZ_MAX_TOKENS.
          question: { type: 'string', minLength: 1, maxLength: 140 },
          answer: { type: 'string', minLength: 1, maxLength: 60 },
          wrong: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, minItems: 3, maxItems: 3 },
          why: { type: 'string', maxLength: 140 },
        },
        required: ['question', 'answer', 'wrong', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

/** Quiz me: QUIZ_COUNT questions, 3–4 survive the checks (roadmap: 3–5), near the ~10 s target. Built from the answer text only, so questions stay on what the student just learned (roadmap v1). */
export function buildQuizPrompt(answer: string) {
  const content = `Explanation:\n${answer.trim().slice(0, QUIZ_ANSWER_MAX_CHARS)}\n\nWrite ${QUIZ_COUNT} short questions about this explanation.`;
  return { system: QUIZ_RULES, turns: [{ role: 'user', content } satisfies Turn], jsonSchema: QUIZ_SCHEMA, maxTokens: QUIZ_MAX_TOKENS };
}
