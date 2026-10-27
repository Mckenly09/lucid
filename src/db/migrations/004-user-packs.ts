// Students' own packs (notes they type, paste or import), searched like downloaded packs, and the sources an answer
// used (shown as source chips). Never edit this file; add 005-… instead.
export default `
CREATE TABLE user_packs (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX user_packs_uid ON user_packs (uid, updated_at DESC);

CREATE TABLE user_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id TEXT NOT NULL REFERENCES user_packs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX user_notes_pack ON user_notes (pack_id, id);

-- External-content FTS5 index, kept in sync by triggers (also on cascade deletes).
CREATE VIRTUAL TABLE user_notes_fts USING fts5(title, text, content='user_notes', content_rowid='id');
CREATE TRIGGER user_notes_ai AFTER INSERT ON user_notes BEGIN
  INSERT INTO user_notes_fts (rowid, title, text) VALUES (new.id, new.title, new.text);
END;
CREATE TRIGGER user_notes_ad AFTER DELETE ON user_notes BEGIN
  INSERT INTO user_notes_fts (user_notes_fts, rowid, title, text) VALUES ('delete', old.id, old.title, old.text);
END;
CREATE TRIGGER user_notes_au AFTER UPDATE ON user_notes BEGIN
  INSERT INTO user_notes_fts (user_notes_fts, rowid, title, text) VALUES ('delete', old.id, old.title, old.text);
  INSERT INTO user_notes_fts (rowid, title, text) VALUES (new.id, new.title, new.text);
END;

-- JSON array of source labels for an answer that used reference notes.
ALTER TABLE messages ADD COLUMN sources TEXT;
`;
