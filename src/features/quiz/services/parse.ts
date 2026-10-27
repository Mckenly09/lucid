export type QuizQuestion = { question: string; choices: string[]; correct: number; why: string };

const MAX_QUESTIONS = 5;
const MIN_QUESTIONS = 3;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Fisher–Yates; `random` is injectable for tests. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One question from the model's `{question, answer, wrong[3], why}`, or null if it can't be trusted. */
function toQuestion(raw: unknown, random: () => number): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const question = text(q.question);
  const answer = text(q.answer);
  const wrong = Array.isArray(q.wrong) ? q.wrong.map(text) : [];
  const choices = [answer, ...wrong];
  // Exactly one correct answer: 4 different, non-empty choices.
  const distinct = new Set(choices.map((c) => c.toLowerCase()));
  if (!question || wrong.length !== 3 || choices.some((c) => !c) || distinct.size !== 4) return null;
  const shuffled = shuffle(choices, random);
  return { question, choices: shuffled, correct: shuffled.indexOf(answer), why: text(q.why) };
}

/** The model's JSON → 3–5 checked questions with shuffled choices, or null (then retry once, then show the error). */
export function parseQuiz(json: string, random: () => number = Math.random): QuizQuestion[] | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const list = (data as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return null;
  const questions = list
    .map((q) => toQuestion(q, random))
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, MAX_QUESTIONS);
  return questions.length >= MIN_QUESTIONS ? questions : null;
}
