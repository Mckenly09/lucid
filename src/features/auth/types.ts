export type AuthUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  /** Offline profile with no Google account (local-profile.ts). */
  isLocal?: boolean;
  /** Email-and-password account: deleting it may ask for the password again. */
  usesPassword?: boolean;
};

/** `unverified`: signed in with email and password, but the email isn't confirmed yet (auth.md §5). */
export type AuthStatus = 'loading' | 'signedIn' | 'unverified' | 'signedOut';

/** Maps to the error table in auth.md §5. */
export type AuthErrorKind =
  | 'cancelled'
  | 'offline'
  | 'play-services'
  | 'developer'
  | 'wrong-password'
  | 'email-in-use'
  | 'invalid-email'
  | 'weak-password'
  | 'too-many'
  | 'needs-password'
  | 'other';

export class AuthError extends Error {
  constructor(public kind: AuthErrorKind, message?: string) {
    super(message ?? kind);
  }
}
