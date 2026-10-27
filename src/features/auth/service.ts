import {
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as fbSignOut,
} from '@react-native-firebase/auth';
import { getNetworkStateAsync } from 'expo-network';

import { getGoogleIdToken, googleSignOut, toAuthError } from './google';
import { AuthError } from './types';

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

export async function signOut() {
  await googleSignOut().catch(() => {}); // still sign out of Firebase if Google is unreachable
  await fbSignOut(getAuth());
}

/** Deletes the Firebase account (app-store rule, auth.md §5). Firebase asks for a fresh sign-in if the last one is old. */
export async function deleteAccount() {
  await requireInternet();
  const user = getAuth().currentUser;
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/network-request-failed') throw new AuthError('offline');
    if (code !== 'auth/requires-recent-login') throw toAuthError(e);
    await reauthenticateWithCredential(user, GoogleAuthProvider.credential(await getGoogleIdToken()));
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
