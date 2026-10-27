import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthError } from './types';

// Android reports a misconfigured SHA-1 / web client ID as code 10.
const DEVELOPER_ERROR = '10';

export function configureGoogle() {
  // Only basic profile scopes: uid, name, email, photo (auth.md §5 privacy).
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
}

export function toAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return new AuthError('cancelled');
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return new AuthError('play-services');
    if (e.code === DEVELOPER_ERROR || e.code === 'DEVELOPER_ERROR') return new AuthError('developer', e.message);
    if (e.code === 'NETWORK_ERROR' || e.code === '7') return new AuthError('offline');
  }
  return new AuthError('other', e instanceof Error ? e.message : String(e));
}

export async function getGoogleIdToken(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (isCancelledResponse(res)) throw new AuthError('cancelled');
    // A missing idToken means the web client ID isn't set or doesn't match the Firebase project.
    if (!res.data.idToken) throw new AuthError('developer', 'No ID token: check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    return res.data.idToken;
  } catch (e) {
    throw toAuthError(e);
  }
}

export const googleSignOut = () => GoogleSignin.signOut();
