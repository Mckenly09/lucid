import chats from './001-chats';

/** In order; entry N is applied when the database's user_version is below N + 1. Append only. */
export const MIGRATIONS: string[] = [chats];
