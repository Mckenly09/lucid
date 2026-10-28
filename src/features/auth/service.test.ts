import { deleteUser, reauthenticateWithCredential, signInWithCredential, signOut as fbSignOut } from '@react-native-firebase/auth';
import { getNetworkStateAsync } from 'expo-network';

import { getGoogleIdToken, googleSignOut } from './google';
import { deleteAccount, signInWithGoogle, signOut } from './service';

// Never call Firebase or Google in tests (AGENTS.md): both are faked.
const mockUser = { uid: 'g1' };
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockUser }),
  GoogleAuthProvider: { credential: (token: string) => ({ token }) },
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
}));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('./google', () => ({
  getGoogleIdToken: jest.fn(),
  googleSignOut: jest.fn(),
  toAuthError: (e: unknown) => Object.assign(new Error('wrapped'), { kind: 'other', cause: e }),
}));

const coded = (code: string) => Object.assign(new Error(code), { code });
const online = () => jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true, isInternetReachable: true });

beforeEach(() => {
  jest.clearAllMocks();
  online();
  jest.mocked(getGoogleIdToken).mockResolvedValue('id-token');
  jest.mocked(googleSignOut).mockResolvedValue(null);
});

describe('signInWithGoogle', () => {
  it('signs in to Firebase with the Google token', async () => {
    await signInWithGoogle();
    expect(signInWithCredential).toHaveBeenCalledWith(expect.anything(), { token: 'id-token' });
  });

  it('says offline before opening Google when there is no internet', async () => {
    jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: false, isInternetReachable: false });
    await expect(signInWithGoogle()).rejects.toMatchObject({ kind: 'offline' });
    expect(getGoogleIdToken).not.toHaveBeenCalled();
  });

  it('reports a dropped connection during sign-in as offline', async () => {
    jest.mocked(signInWithCredential).mockRejectedValue(coded('auth/network-request-failed'));
    await expect(signInWithGoogle()).rejects.toMatchObject({ kind: 'offline' });
  });
});

it('signs out of Firebase even when Google is unreachable', async () => {
  jest.mocked(googleSignOut).mockRejectedValue(new Error('no network'));
  await signOut();
  expect(fbSignOut).toHaveBeenCalled();
});

describe('deleteAccount', () => {
  it('deletes the Firebase account and signs out of Google', async () => {
    await deleteAccount();
    expect(deleteUser).toHaveBeenCalledWith(mockUser);
    expect(googleSignOut).toHaveBeenCalled();
  });

  it('signs in again first when Firebase asks for a recent sign-in', async () => {
    jest.mocked(deleteUser).mockRejectedValueOnce(coded('auth/requires-recent-login'));
    await deleteAccount();
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(mockUser, { token: 'id-token' });
    expect(deleteUser).toHaveBeenCalledTimes(2);
  });

  it('needs internet, and never deletes offline', async () => {
    jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: false, isInternetReachable: false });
    await expect(deleteAccount()).rejects.toMatchObject({ kind: 'offline' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('keeps the account when deletion fails for another reason', async () => {
    jest.mocked(deleteUser).mockRejectedValueOnce(coded('auth/internal-error'));
    await expect(deleteAccount()).rejects.toMatchObject({ kind: 'other' });
    expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(googleSignOut).not.toHaveBeenCalled();
  });
});
