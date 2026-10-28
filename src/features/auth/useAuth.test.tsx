import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { deleteUserData } from '@/db/user-data';
import { cancelReminder } from '@/features/flashcards/reminder';

import { AuthContext } from './AuthProvider';
import { deleteAccount, signOut as googleSignOut } from './service';
import type { AuthUser } from './types';
import { useAuth } from './useAuth';

// Never call Firebase in tests (AGENTS.md); the database, chat, reminder and stores are faked too.
jest.mock('./AuthProvider', () => ({ AuthContext: jest.requireActual('react').createContext(null) }));
jest.mock('./service', () => ({ deleteAccount: jest.fn(), signInWithGoogle: jest.fn(), signOut: jest.fn() }));
const mockClearProfile = jest.fn();
jest.mock('./local-profile', () => ({ useLocalProfile: { getState: () => ({ clear: mockClearProfile, create: jest.fn() }) } }));
const mockStop = jest.fn();
jest.mock('@/features/chat/store', () => ({ useChat: { getState: () => ({ stop: mockStop }), setState: jest.fn() } }));
const mockResetSettings = jest.fn();
jest.mock('@/features/settings/store', () => ({ useSettings: { getState: () => ({ reset: mockResetSettings }) } }));
jest.mock('@/features/flashcards/reminder', () => ({ cancelReminder: jest.fn() }));
jest.mock('@/db/user-data', () => ({ deleteUserData: jest.fn() }));

const google: AuthUser = { uid: 'g1', name: 'Ana', email: 'ana@example.com', photoUrl: null };
const local: AuthUser = { uid: 'local-1', name: 'Ana', email: null, photoUrl: null, isLocal: true };

// renderHook is async in @testing-library/react-native v14.
const as = async (user: AuthUser) =>
  (
    await renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AuthContext.Provider value={{ status: 'signedIn', user }}>{children}</AuthContext.Provider>
      ),
    })
  ).result.current;

beforeEach(() => jest.clearAllMocks());

describe('signOut', () => {
  it('keeps chats and cards by default, so signing back in finds them', async () => {
    const auth = await as(google);
    await act(() => auth.signOut());
    expect(deleteUserData).not.toHaveBeenCalled();
    expect(googleSignOut).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  it('removes this account’s data when the student chooses to', async () => {
    const auth = await as(google);
    await act(() => auth.signOut({ keepData: false }));
    expect(deleteUserData).toHaveBeenCalledWith('g1');
  });

  it('removing an offline profile always removes its data (nothing can reach it again)', async () => {
    const auth = await as(local);
    await act(() => auth.signOut());
    expect(deleteUserData).toHaveBeenCalledWith('local-1');
    expect(mockClearProfile).toHaveBeenCalled();
    expect(googleSignOut).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  it('deletes the Google account, then the data, settings and reminders on the phone', async () => {
    const auth = await as(google);
    await act(() => auth.deleteAccount());
    expect(deleteAccount).toHaveBeenCalled();
    expect(deleteUserData).toHaveBeenCalledWith('g1');
    expect(mockResetSettings).toHaveBeenCalled();
    expect(cancelReminder).toHaveBeenCalled();
  });

  it('keeps everything on the phone when the Google account could not be deleted', async () => {
    jest.mocked(deleteAccount).mockRejectedValueOnce(new Error('offline'));
    const auth = await as(google);
    await expect(auth.deleteAccount()).rejects.toThrow('offline');
    expect(deleteUserData).not.toHaveBeenCalled();
    expect(mockResetSettings).not.toHaveBeenCalled();
  });

  it('an offline profile needs no internet: its data and profile are removed on the phone', async () => {
    const auth = await as(local);
    await act(() => auth.deleteAccount());
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(deleteUserData).toHaveBeenCalledWith('local-1');
    expect(mockClearProfile).toHaveBeenCalled();
  });
});

it('must be used inside the auth provider', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(renderHook(() => useAuth())).rejects.toThrow('useAuth must be used inside <AuthProvider>');
});
