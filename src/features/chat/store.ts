import { create } from 'zustand';

import { getChat, saveMessage } from '@/db/chats';
import { findReferenceNotes } from '@/features/knowledge/retrieve';
import { modelFile, toPath } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import { useSettings } from '@/features/settings/store';
import * as engine from '@/llm/engine';
import { modelById } from '@/llm/models';
import { buildExplainPrompt, buildPrompt, EXPLAIN_LABEL, type ExplainKind } from '@/llm/prompts';
import { checkArithmetic } from '@/llm/subjects/calculator';
import { subject, type SubjectId } from '@/llm/subjects/config';

/** `sources`: the packs an answer's reference notes came from (source chips). */
export type Message = engine.Turn & { sources?: string[] };
export type Chat = { id: string; uid: string; subject: SubjectId; messages: Message[] };
export type ChatStatus = 'idle' | 'loading' | 'generating';
export type ChatError = 'no-model' | 'load' | 'generate';

type State = {
  /** Chats opened this session; SQLite (src/db/chats.ts) holds them all. */
  chats: Record<string, Chat>;
  /** The chat that owns the current load or answer; only one runs at a time. */
  activeId: string | null;
  status: ChatStatus;
  error: { chatId: string; kind: ChatError } | null;
  newChat: (uid: string, subject: SubjectId) => string;
  /** Loads a saved chat into memory; false when it doesn't exist for this account. */
  open: (uid: string, chatId: string) => boolean;
  ask: (chatId: string, question: string) => Promise<void>;
  /** Explain simpler / Give an example / language switch, on the last answer only. */
  explain: (chatId: string, kind: ExplainKind) => Promise<void>;
  /** Re-sends the last question after an error. */
  retry: (chatId: string) => void;
  stop: () => void;
};

type Prompt = ReturnType<typeof buildPrompt> & { sources?: string[] };

// The model only gets role and content; source labels are for the screen.
const turn = ({ role, content }: Message) => ({ role, content }) as engine.Turn;

/** A question's prompt, with reference notes from the student's packs when any match. */
function askPrompt(chat: Chat, question: string, history: Message[]): Prompt {
  const { notes, sources } = findReferenceNotes(chat.uid, chat.subject, question);
  const language = useSettings.getState().answerLanguage;
  return { ...buildPrompt({ subjectId: chat.subject, question, history: history.map(turn), notes, language }), sources };
}

let generation: engine.Generation | null = null;
/** The prompt of the latest answer, so Retry re-sends exactly that (an explain prompt isn't its chip label). */
let lastPrompt: { chatId: string; prompt: Prompt } | null = null;

export const useChat = create<State>()((set, get) => {
  const edit = (chatId: string, fn: (messages: Message[]) => Message[]) =>
    set((s) => {
      const chat = s.chats[chatId];
      return chat ? { chats: { ...s.chats, [chatId]: { ...chat, messages: fn(chat.messages) } } } : {};
    });
  const appendToAnswer = (chatId: string, token: string) =>
    edit(chatId, (m) => [...m.slice(0, -1), { ...m[m.length - 1], content: m[m.length - 1].content + token }]);
  // An answer stopped or failed before its first word leaves nothing worth showing.
  const dropEmptyAnswer = (chatId: string) =>
    edit(chatId, (m) => (m[m.length - 1]?.role === 'assistant' && !m[m.length - 1].content ? m.slice(0, -1) : m));
  const save = (chat: Chat, role: Message['role'], content: string, sources?: string[]) => {
    try {
      saveMessage(chat.uid, chat, role, content, sources);
    } catch (e) {
      // A failed write keeps the answer on screen; it only misses History. Never log the content itself.
      console.warn('Could not save message', e instanceof Error ? e.message : e);
    }
  };
  const fail = (chatId: string, kind: ChatError) => set({ status: 'idle', activeId: null, error: { chatId, kind } });

  /** Answers the chat's last message with `prompt`. */
  const answer = async (chat: Chat, prompt: Prompt) => {
    const chatId = chat.id;
    lastPrompt = { chatId, prompt };
    const installedId = useModels.getState().installedId;
    if (!installedId) return fail(chatId, 'no-model');
    const path = toPath(modelFile(modelById(installedId)).uri);
    if (!engine.isLoaded(path)) {
      set({ status: 'loading' });
      try {
        await engine.load(path);
      } catch {
        return fail(chatId, 'load');
      }
      // Stop (or leaving the screen) during the load cancels the answer.
      if (get().activeId !== chatId) return;
    }

    edit(chatId, (m) => [...m, { role: 'assistant', content: '', sources: prompt.sources?.length ? prompt.sources : undefined }]);
    set({ status: 'generating' });
    try {
      generation = engine.generate({
        ...prompt,
        onToken: (token) => appendToAnswer(chatId, token),
      });
      let text = await generation.done;
      // Never trust the model's arithmetic (AGENTS.md): mark wrong results with the calculator's value.
      if (subject(chat.subject).usesCalculator) {
        const checked = checkArithmetic(text);
        if (checked.wrong) {
          text = checked.text;
          edit(chatId, (m) => [...m.slice(0, -1), { ...m[m.length - 1], content: text }]);
        }
      }
      // Stopped answers are saved too, with what was written so far.
      if (text.trim()) save(chat, 'assistant', text, prompt.sources);
      set({ status: 'idle', activeId: null });
    } catch {
      fail(chatId, 'generate');
    } finally {
      generation = null;
      dropEmptyAnswer(chatId);
    }
  };

  /** Shows and saves the student's message, then answers it. */
  const send = async (chat: Chat, shown: string, prompt: Prompt) => {
    edit(chat.id, (m) => [...m, { role: 'user', content: shown }]);
    save(chat, 'user', shown);
    set({ error: null, activeId: chat.id });
    await answer(chat, prompt);
  };

  return {
    chats: {},
    activeId: null,
    status: 'idle',
    error: null,

    newChat: (uid, subject) => {
      const id = String(Date.now());
      set((s) => ({ chats: { ...s.chats, [id]: { id, uid, subject, messages: [] } } }));
      return id;
    },

    open: (uid, chatId) => {
      if (get().chats[chatId]) return true;
      const stored = getChat(uid, chatId);
      if (!stored) return false;
      set((s) => ({ chats: { ...s.chats, [chatId]: { ...stored, uid } } }));
      return true;
    },

    ask: async (chatId, question) => {
      const chat = get().chats[chatId];
      if (!chat || get().status !== 'idle' || !question.trim()) return;
      await send(chat, question.trim(), askPrompt(chat, question, chat.messages));
    },

    explain: async (chatId, kind) => {
      const chat = get().chats[chatId];
      const last = chat?.messages[chat.messages.length - 1];
      if (!chat || get().status !== 'idle' || last?.role !== 'assistant') return;
      await send(chat, EXPLAIN_LABEL[kind], buildExplainPrompt({ subjectId: chat.subject, kind, lastAnswer: last.content }));
    },

    retry: (chatId) => {
      const messages = get().chats[chatId]?.messages ?? [];
      const last = messages[messages.length - 1];
      if (last?.role !== 'user') return;
      const chat = get().chats[chatId];
      if (!chat || get().status !== 'idle') return;
      set({ error: null, activeId: chatId });
      const prompt = lastPrompt?.chatId === chatId ? lastPrompt.prompt : askPrompt(chat, last.content, messages.slice(0, -1));
      void answer(chat, prompt);
    },

    stop: () => {
      generation?.stop();
      set({ status: 'idle', activeId: null });
    },
  };
});
