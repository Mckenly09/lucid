export type AuthUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
};

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** Maps to the error table in auth.md §5. */
export type AuthErrorKind = 'cancelled' | 'offline' | 'play-services' | 'developer' | 'other';

export class AuthError extends Error {
  constructor(public kind: AuthErrorKind, message?: string) {
    super(message ?? kind);
  }
}
