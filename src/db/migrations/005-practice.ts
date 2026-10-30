// Practice by topic (v2.md §3): session scores per student, and checked questions cached per topic so the next session
// starts without waiting. The cache is built from packs, not from the student, so it has no uid; `pack_key` names the
// pack versions it came from, so an updated pack never serves old questions. Never edit this file; add 006-… instead.
export default `
CREATE TABLE practice_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  topic TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX practice_sessions_uid ON practice_sessions (uid, subject, grade, topic, created_at);

CREATE TABLE practice_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  pack_key TEXT NOT NULL,
  json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX practice_questions_topic ON practice_questions (topic, pack_key);
`;
