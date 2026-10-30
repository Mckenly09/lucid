import type { CatalogPack } from '@/features/knowledge/services/catalog';

import { packKey, practiceTopics, topicName } from './topics';

const pack = (id: string, version = 1) => ({ id, version, attribution: id }) as CatalogPack;
const row = (subject: string, grade: number, topic: string) => ({ subject, grade, topic });

describe('topicName', () => {
  it('uses the DepEd name from topics.json', () => {
    expect(topicName('sci9-volcanoes')).toBe('Volcanoes');
  });
  it('still reads when a code is missing', () => {
    expect(topicName('sci9-new-topic')).toBe('Sci9 new topic');
  });
});

describe('practiceTopics', () => {
  const rows: Record<string, ReturnType<typeof row>[]> = {
    chem: [row('science', 9, 'sci9-bonding'), row('science', 9, 'sci9-electron-config')],
    earth: [row('science', 9, 'sci9-volcanoes'), row('science', 8, 'sci8-earthquakes')],
    extra: [row('science', 9, 'sci9-bonding'), row('history', 9, 'his-1')],
  };

  it('orders by grade, then the curriculum, and merges a topic found in two packs', () => {
    const topics = practiceTopics([pack('chem'), pack('earth'), pack('extra')], (p) => rows[p.id]);
    expect(topics.map((t) => `${t.grade} ${t.code}`)).toEqual([
      '8 sci8-earthquakes',
      '9 sci9-electron-config',
      '9 sci9-bonding',
      '9 sci9-volcanoes',
    ]);
    expect(topics.find((t) => t.code === 'sci9-bonding')?.packs.map((p) => p.id)).toEqual(['chem', 'extra']);
  });

  it('skips a pack that fails to open and subjects the app does not know', () => {
    const topics = practiceTopics([pack('broken'), pack('extra')], (p) => {
      if (p.id === 'broken') throw new Error('cannot open');
      return rows[p.id];
    });
    expect(topics.map((t) => t.code)).toEqual(['sci9-bonding']);
  });

  it('is empty with no packs', () => {
    expect(practiceTopics([], () => [])).toEqual([]);
  });
});

it('packKey names the pack versions in a stable order', () => {
  const [t] = practiceTopics([pack('earth', 2), pack('chem', 3)], () => [row('science', 9, 'sci9-bonding')]);
  expect(packKey(t)).toBe('chem@3,earth@2');
});
