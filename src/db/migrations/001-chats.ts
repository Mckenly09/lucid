// Chats and their messages, keyed by the signed-in uid. Never edit this file; add 002-… instead.
export default `
CREATE TABLE chats (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX chats_uid_updated ON chats (uid, updated_at DESC);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX messages_chat ON messages (chat_id, id);
`;
