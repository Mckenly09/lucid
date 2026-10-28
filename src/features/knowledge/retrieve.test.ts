import { sourceDetails } from './retrieve';
import type { CatalogPack } from './services/catalog';
import { usePacks } from './store';

// No SQLite or pack files in tests: only the installed-pack list matters here.
jest.mock('@/db/user-packs', () => ({ searchUserNotes: jest.fn() }));
jest.mock('./pack-files', () => ({ searchPack: jest.fn() }));
jest.mock('./store', () => ({ usePacks: { getState: jest.fn() } }));

const chemistry = { id: 'science-chemistry', name: 'Chemistry', license: 'CC BY 4.0', attribution: 'OpenStax Chemistry 2e' };

beforeEach(() => {
  jest.mocked(usePacks.getState).mockReturnValue({
    installed: { [chemistry.id]: chemistry as CatalogPack },
  } as unknown as ReturnType<typeof usePacks.getState>);
});

it("finds the student's own notes", () => {
  expect(sourceDetails('Your notes · Bio')).toEqual({ title: 'Bio', mine: true, pack: null });
});

it('finds the installed pack and the section title from the chip label', () => {
  expect(sourceDetails('Chemistry · Covalent Bonds')).toEqual({ title: 'Covalent Bonds', mine: false, pack: chemistry });
});

it('keeps the label when the pack was removed since the answer', () => {
  expect(sourceDetails('Physics · Motion')).toEqual({ title: 'Physics · Motion', mine: false, pack: null });
});
