import type { Deck, FlashCard } from './cards';

export type { Deck, FlashCard } from './cards';

// Web is a design preview without SQLite (see chats.web.ts), so there are no cards there.
export function saveCard(_uid: string, _card: object) {}
export const listDueCards = (_uid: string, _before: number): FlashCard[] => [];
export function saveReview(_uid: string, _id: string, _next: object) {}
export const listDecks = (_uid: string, _dueBefore: number): Deck[] => [];
export const countDueBetween = (_uid: string, _from: number, _to: number) => 0;
