// Flashcards with their SM-2 review state, keyed by uid. Never edit this file; add 003-… instead.
export default `
CREATE TABLE cards (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  subject TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  chat_id TEXT REFERENCES chats (id) ON DELETE SET NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX cards_uid_due ON cards (uid, due_at);
`;
