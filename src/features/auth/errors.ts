import { AuthError, type AuthErrorKind } from './types';

export type ShownAuthError = Exclude<AuthErrorKind, 'cancelled'>;

// auth.md §5 error table. 'cancelled' shows nothing.
export const AUTH_ERRORS: Record<ShownAuthError, { status: 'warning' | 'danger'; message: string }> = {
  offline: { status: 'warning', message: 'Connect to the internet once to sign in.' },
  'play-services': { status: 'warning', message: 'Update Google Play Services, then try again.' },
  developer: {
    status: 'danger',
    message: __DEV__
      ? 'DEVELOPER_ERROR: check the SHA-1 fingerprints in Firebase and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
      : "Sign-in didn't work. Please try again.",
  },
  'wrong-password': { status: 'danger', message: "That email and password don't match. Try again or reset your password." },
  'email-in-use': { status: 'warning', message: 'An account already uses this email. Log in instead.' },
  'invalid-email': { status: 'danger', message: 'Check your email address, then try again.' },
  'weak-password': { status: 'danger', message: 'Choose a stronger password.' },
  'too-many': { status: 'warning', message: 'Too many tries. Wait a few minutes, then try again.' },
  'needs-password': { status: 'warning', message: 'Enter your password to confirm it’s you.' },
  other: { status: 'danger', message: "Sign-in didn't work. Please try again." },
};

/** The error to show for `e`, or null when the student cancelled. */
export function shownError(e: unknown): ShownAuthError | null {
  const kind = e instanceof AuthError ? e.kind : 'other';
  return kind === 'cancelled' ? null : kind;
}
