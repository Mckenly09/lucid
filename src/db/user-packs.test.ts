import { getDb } from './client';
import { testDb } from './test-db';
import {
  addNotes,
  createUserPack,
  deleteNote,
  deleteUserPack,
  getNote,
  getUserPack,
  listNotes,
  listUserPacks,
  searchUserNotes,
  updateNote,
  updateUserPack,
} from './user-packs';

jest.mock('./client', () => ({ getDb: jest.fn() }));

beforeEach(() => {
  jest.mocked(getDb).mockReturnValue(testDb());
});

it('creates a pack, adds notes and counts them', () => {
  const id = createUserPack('u1', { name: 'Bio', subject: 'science' });
  addNotes('u1', id, [
    { title: 'Cells', text: 'The cell is the basic unit of life.' },
    { title: 'Leaves', text: 'Chlorophyll absorbs light.' },
  ]);
  expect(getUserPack('u1', id)).toMatchObject({ name: 'Bio', subject: 'science', notes: 2 });
  expect(listNotes('u1', id).map((n) => n.title)).toEqual(['Cells', 'Leaves']);
});

it('finds notes by full-text search, in the subject and General packs only', () => {
  const bio = createUserPack('u1', { name: 'Bio', subject: 'science' });
  const general = createUserPack('u1', { name: 'Misc', subject: 'general' });
  const math = createUserPack('u1', { name: 'Algebra', subject: 'math' });
  addNotes('u1', bio, [{ title: 'Leaves', text: 'Chlorophyll absorbs light.' }]);
  addNotes('u1', general, [{ title: 'Light', text: 'Light travels fast.' }]);
  addNotes('u1', math, [{ title: 'Light problems', text: 'Speed of light word problems.' }]);
  const hits = searchUserNotes('u1', 'science', 'light');
  expect(hits.map((h) => h.packName).sort()).toEqual(['Bio', 'Misc']);
});

it('keeps the search index in step with edits and deletes', () => {
  const id = createUserPack('u1', { name: 'Bio', subject: 'science' });
  addNotes('u1', id, [{ title: 'Leaves', text: 'Chlorophyll absorbs light.' }]);
  const [note] = listNotes('u1', id);
  updateNote('u1', id, note.id, { title: 'Roots', text: 'Roots take in water.' });
  expect(searchUserNotes('u1', 'science', 'chlorophyll')).toEqual([]);
  expect(searchUserNotes('u1', 'science', 'water')).toHaveLength(1);
  deleteNote('u1', id, note.id);
  expect(searchUserNotes('u1', 'science', 'water')).toEqual([]);
});

it('deletes a pack with its notes and their search entries', () => {
  const id = createUserPack('u1', { name: 'Bio', subject: 'science' });
  addNotes('u1', id, [{ title: 'Leaves', text: 'Chlorophyll absorbs light.' }]);
  deleteUserPack('u1', id);
  expect(listUserPacks('u1')).toEqual([]);
  expect(searchUserNotes('u1', 'science', 'chlorophyll')).toEqual([]);
});

it("never reads, edits or searches another student's notes", () => {
  const id = createUserPack('u1', { name: 'Bio', subject: 'science' });
  addNotes('u1', id, [{ title: 'Leaves', text: 'Chlorophyll absorbs light.' }]);
  const [note] = listNotes('u1', id);
  expect(listNotes('u2', id)).toEqual([]);
  expect(getNote('u2', id, note.id)).toBeNull();
  updateNote('u2', id, note.id, { title: 'hacked', text: 'hacked' });
  updateUserPack('u2', id, { name: 'hacked', subject: 'math' });
  deleteUserPack('u2', id);
  expect(searchUserNotes('u2', 'science', 'chlorophyll')).toEqual([]);
  expect(getNote('u1', id, note.id)?.title).toBe('Leaves');
  expect(getUserPack('u1', id)?.name).toBe('Bio');
});

it('adds an imported file all or nothing, and only to your own pack', () => {
  const id = createUserPack('u1', { name: 'Bio', subject: 'science' });
  expect(() => addNotes('u2', id, [{ title: 'x', text: 'y' }])).toThrow('Pack not found');
  expect(listNotes('u1', id)).toEqual([]);
});
