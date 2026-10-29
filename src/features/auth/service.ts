import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from '@react-native-firebase/auth';
import { getNetworkStateAsync } from 'expo-network';

import { getGoogleIdToken, googleSignOut, toAuthError } from './google';
import { AuthError, type AuthErrorKind } from './types';

async function requireInternet() {
  const net = await getNetworkStateAsync();
  if (net.isConnected === false || net.isInternetReachable === false) throw new AuthError('offline');
}

export async function signInWithGoogle() {
  await requireInternet();
  const idToken = await getGoogleIdToken();
  try {
    return await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
  } catch (e) {
    const code = (e as { code?: string }).code;
    throw code === 'auth/network-request-failed' ? new AuthError('offline') : toAuthError(e);
  }
}

const EMAIL_ERRORS: Record<string, AuthErrorKind> = {
  'auth/network-request-failed': 'offline',
  'auth/invalid-credential': 'wrong-password',
  'auth/wrong-password': 'wrong-password',
  'auth/user-not-found': 'wrong-password',
  'auth/invalid-email': 'invalid-email',
  'auth/email-already-in-use': 'email-in-use',
  'auth/weak-password': 'weak-password',
  'auth/too-many-requests': 'too-many',
};

function toEmailError(e: unknown) {
  const kind = EMAIL_ERRORS[(e as { code?: string }).code ?? ''];
  return kind ? new AuthError(kind) : toAuthError(e);
}

/** Wraps a Firebase email call: internet first, then Firebase's codes mapped to auth.md §5. */
async function emailCall<T>(run: () => Promise<T>) {
  await requireInternet();
  try {
    return await run();
  } catch (e) {
    throw toEmailError(e);
  }
}

let sentAt = 0;
/** When this session last sent a confirmation email (0: not yet), so the screen can time "Resend". */
export const verificationSentAt = () => sentAt;

export const signInWithEmail = (email: string, password: string) =>
  emailCall(() => signInWithEmailAndPassword(getAuth(), email.trim(), password));

/** Creates the account, saves the name, and sends the confirmation email; the student stays `unverified` until they tap it. */
export const registerWithEmail = (name: string, email: string, password: string) =>
  emailCall(async () => {
    const { user } = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
    if (name.trim()) await updateProfile(user, { displayName: name.trim() });
    await sendEmailVerification(user);
    sentAt = Date.now();
  });

export const resendVerification = () =>
  emailCall(async () => {
    const user = getAuth().currentUser;
    if (!user) return;
    await sendEmailVerification(user);
    sentAt = Date.now();
  });

/** Re-reads the user from Firebase; true once the student has tapped the link in the email. */
export const checkVerified = () =>
  emailCall(async () => {
    const user = getAuth().currentUser;
    if (!user) return false;
    await reload(user);
    return getAuth().currentUser?.emailVerified === true;
  });

/** "Wrong email? Change it": removes the unconfirmed account so the student can register again. */
export async function cancelRegistration() {
  const user = getAuth().currentUser;
  if (user) await deleteUser(user).catch(() => fbSignOut(getAuth()));
}

/** Sends the reset link. An unknown email resolves too, so the screen never reveals who has an account. */
export const resetPassword = (email: string) =>
  emailCall(async () => {
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    }
  });

/** Email-and-password account (Google accounts have no 'password' provider). */
export const usesPassword = (user: User) => user.providerData.some((p) => p.providerId === 'password');

export async function signOut() {
  await googleSignOut().catch(() => {}); // still sign out of Firebase if Google is unreachable
  await fbSignOut(getAuth());
}

/**
 * Deletes the Firebase account (app-store rule, auth.md §5). Firebase asks for a fresh sign-in if the last one is old:
 * Google opens its picker again; an email account needs `password` (missing → `needs-password`).
 */
export async function deleteAccount(password?: string) {
  await requireInternet();
  const user = getAuth().currentUser;
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/network-request-failed') throw new AuthError('offline');
    if (code !== 'auth/requires-recent-login') throw toAuthError(e);
    if (usesPassword(user)) {
      if (!password) throw new AuthError('needs-password');
      try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password));
      } catch (err) {
        throw toEmailError(err);
      }
    } else {
      await reauthenticateWithCredential(user, GoogleAuthProvider.credential(await getGoogleIdToken()));
    }
    await deleteUser(user);
  }
  await googleSignOut().catch(() => {});
}

/** Only for calls to your own backend. Returns null when offline and the token can't refresh. */
export async function getIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(); // refreshes automatically if expired and online
  } catch {
    return null; // offline: skip the network call, never sign the user out
  }
}
