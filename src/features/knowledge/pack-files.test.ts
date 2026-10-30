import { DatabaseSync } from 'node:sqlite';

import { packTopics, topicChunks } from './pack-files';

// A real in-memory pack (docs/packs.md schema) behind the two expo-sqlite calls pack-files uses.
const mockPack = new DatabaseSync(':memory:');
mockPack.exec(`CREATE TABLE chunks (id INTEGER PRIMARY KEY, subject TEXT NOT NULL, grade INTEGER, topic TEXT NOT NULL,
  title TEXT NOT NULL, text TEXT NOT NULL, source_url TEXT)`);
const add = mockPack.prepare('INSERT INTO chunks (subject, grade, topic, title, text) VALUES (?, ?, ?, ?, ?)');
for (let i = 0; i < 6; i++) add.run('science', 9, 'sci9-volcanoes', `Volcanoes ${i}`, `Magma ${i}`);
add.run('science', 9, 'sci9-bonding', 'Bonds', 'Ionic bonds');
add.run('science', 10, 'sci10-plates', 'Plates', 'Plate tectonics');
add.run('science', null, 'sci-misc', 'Misc', 'No grade');

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    getAllSync: (sql: string, ...args: (string | number)[]) => mockPack.prepare(sql).all(...args),
  }),
}));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(() => ({ uri: 'file:///packs' })),
  File: jest.fn(),
  Paths: {},
}));
jest.mock('@/features/models/services/files', () => ({ toPath: (u: string) => u }));

const ref = { id: 'science-earth', version: 1 };

it('lists each topic once per grade and leaves out chunks without a grade', () => {
  expect(packTopics(ref)).toEqual([
    { subject: 'science', grade: 9, topic: 'sci9-bonding' },
    { subject: 'science', grade: 9, topic: 'sci9-volcanoes' },
    { subject: 'science', grade: 10, topic: 'sci10-plates' },
  ]);
});

it('picks up to `limit` chunks of the topic only', () => {
  const picked = topicChunks(ref, 'sci9-volcanoes', 4);
  expect(picked).toHaveLength(4);
  expect(picked.every((c) => c.title.startsWith('Volcanoes'))).toBe(true);
  expect(topicChunks(ref, 'sci9-bonding', 4)).toEqual([{ title: 'Bonds', text: 'Ionic bonds' }]);
});
