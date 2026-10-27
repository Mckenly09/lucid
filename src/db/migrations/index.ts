import chats from './001-chats';
import cards from './002-cards';
import quizResults from './003-quiz-results';
import userPacks from './004-user-packs';

/** In order; entry N is applied when the database's user_version is below N + 1. Append only. */
export const MIGRATIONS: string[] = [chats, cards, quizResults, userPacks];
