// The senior high course a chat is about (src/llm/subjects/courses.ts), null for "any course". Never edit this file;
// add 007-… instead.
export default `
ALTER TABLE chats ADD COLUMN course TEXT;
`;
