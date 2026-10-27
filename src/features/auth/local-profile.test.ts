import { useLocalProfile } from './local-profile';

jest.mock('@/utils/kv-storage', () => {
  const memory = new Map<string, string>();
  return {
    storage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
    },
  };
});

beforeEach(() => useLocalProfile.getState().clear());

test('creates a local profile with a trimmed name and a local uid', () => {
  useLocalProfile.getState().create('  Juan  ');
  const p = useLocalProfile.getState().profile;
  expect(p).toMatchObject({ name: 'Juan', email: null, photoUrl: null, isLocal: true });
  expect(p?.uid).toMatch(/^local-/);
});

test('a blank name is stored as null, and clear removes the profile', () => {
  useLocalProfile.getState().create('   ');
  expect(useLocalProfile.getState().profile?.name).toBeNull();
  useLocalProfile.getState().clear();
  expect(useLocalProfile.getState().profile).toBeNull();
});
