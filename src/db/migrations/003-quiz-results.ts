// Quiz me scores per subject (roadmap v1), keyed by uid. Never edit this file; add 004-… instead.
export default `
CREATE TABLE quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  subject TEXT NOT NULL,
  chat_id TEXT REFERENCES chats (id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX quiz_results_uid ON quiz_results (uid, subject);
`;
