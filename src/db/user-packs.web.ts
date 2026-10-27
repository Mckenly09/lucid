import type { NoteHit, UserNote, UserPack } from './user-packs';

export type { NoteHit, UserNote, UserPack } from './user-packs';

// Web is a design preview without SQLite (see chats.web.ts), so there are no student packs there.
export const listUserPacks = (_uid: string): UserPack[] => [];
export const getUserPack = (_uid: string, _id: string): UserPack | null => null;
export const createUserPack = (_uid: string, _pack: object) => '';
export function updateUserPack(_uid: string, _id: string, _pack: object) {}
export function deleteUserPack(_uid: string, _id: string) {}
export const listNotes = (_uid: string, _packId: string): UserNote[] => [];
export const getNote = (_uid: string, _packId: string, _noteId: number): UserNote | null => null;
export function addNotes(_uid: string, _packId: string, _notes: object[]) {}
export function updateNote(_uid: string, _packId: string, _noteId: number, _note: object) {}
export function deleteNote(_uid: string, _packId: string, _noteId: number) {}
export const searchUserNotes = (_uid: string, _subject: string, _match: string, _limit = 3): NoteHit[] => [];
