import {
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from '@react-native-firebase/auth';
import { getNetworkStateAsync } from 'expo-network';

import { getGoogleIdToken, googleSignOut } from './google';
import { passwordChecks } from './password';
import {
  checkVerified,
  deleteAccount,
  registerWithEmail,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  verificationSentAt,
} from './service';

// Never call Firebase or Google in tests (AGENTS.md): both are faked.
const mockUser = { uid: 'g1', email: 'ana@email.com', emailVerified: false, providerData: [] as { providerId: string }[] };
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockUser }),
  GoogleAuthProvider: { credential: (token: string) => ({ token }) },
  EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) },
  signInWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  reload: jest.fn(),
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
  mockUser.providerData = [];
  mockUser.emailVerified = false;
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

  it('asks an email account for its password before signing in again', async () => {
    mockUser.providerData = [{ providerId: 'password' }];
    jest.mocked(deleteUser).mockRejectedValue(coded('auth/requires-recent-login'));
    await expect(deleteAccount()).rejects.toMatchObject({ kind: 'needs-password' });
    expect(getGoogleIdToken).not.toHaveBeenCalled();

    jest.mocked(deleteUser).mockReset().mockRejectedValueOnce(coded('auth/requires-recent-login'));
    await deleteAccount('secret123');
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(mockUser, { email: 'ana@email.com', password: 'secret123' });
    expect(deleteUser).toHaveBeenCalledTimes(2);
  });

  it('reports a wrong password while confirming deletion', async () => {
    mockUser.providerData = [{ providerId: 'password' }];
    jest.mocked(deleteUser).mockRejectedValueOnce(coded('auth/requires-recent-login'));
    jest.mocked(reauthenticateWithCredential).mockRejectedValueOnce(coded('auth/invalid-credential'));
    await expect(deleteAccount('nope')).rejects.toMatchObject({ kind: 'wrong-password' });
  });
});

describe('email and password', () => {
  it('signs in with a trimmed email', async () => {
    await signInWithEmail(' ana@email.com ', 'pass1234');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'ana@email.com', 'pass1234');
  });

  it.each([
    ['auth/invalid-credential', 'wrong-password'],
    ['auth/wrong-password', 'wrong-password'],
    ['auth/user-not-found', 'wrong-password'],
    ['auth/invalid-email', 'invalid-email'],
    ['auth/too-many-requests', 'too-many'],
    ['auth/network-request-failed', 'offline'],
  ])('shows Firebase %s as %s', async (code, kind) => {
    jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(coded(code));
    await expect(signInWithEmail('a@b.co', 'x')).rejects.toMatchObject({ kind });
  });

  it('needs internet to sign in, and never calls Firebase offline', async () => {
    jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: false, isInternetReachable: false });
    await expect(signInWithEmail('a@b.co', 'x')).rejects.toMatchObject({ kind: 'offline' });
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('registers: creates the account, saves the name, sends the confirmation email', async () => {
    jest.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as never);
    await registerWithEmail(' Ana Santos ', 'ana@email.com', 'pass1234');
    expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Ana Santos' });
    expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
    expect(verificationSentAt()).toBeGreaterThan(0);
  });

  it('reports an email that already has an account', async () => {
    jest.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(coded('auth/email-already-in-use'));
    await expect(registerWithEmail('Ana', 'ana@email.com', 'pass1234')).rejects.toMatchObject({ kind: 'email-in-use' });
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('checks the confirmation by reloading the user', async () => {
    jest.mocked(reload).mockImplementationOnce(async () => {
      mockUser.emailVerified = true;
    });
    expect(await checkVerified()).toBe(true);
    expect(reload).toHaveBeenCalledWith(mockUser);
  });

  it('resolves a reset for an unknown email, so the screen never reveals who has an account', async () => {
    jest.mocked(sendPasswordResetEmail).mockRejectedValueOnce(coded('auth/user-not-found'));
    await expect(resetPassword('nobody@email.com')).resolves.toBeUndefined();
    jest.mocked(sendPasswordResetEmail).mockRejectedValueOnce(coded('auth/invalid-email'));
    await expect(resetPassword('nope')).rejects.toMatchObject({ kind: 'invalid-email' });
  });

  it('password rules: 8+ characters, a letter and a number', () => {
    expect(passwordChecks('abc')).toEqual({ length: false, letter: true, number: false });
    expect(passwordChecks('12345678')).toEqual({ length: true, letter: false, number: true });
    expect(passwordChecks('ñandú2024')).toEqual({ length: true, letter: true, number: true });
  });
});
