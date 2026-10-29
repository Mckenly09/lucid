import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { moveUserData } from '@/db/user-data';

import { configureGoogle } from './google';
import { usesPassword as hasPassword } from './service';
import { useLocalProfile } from './local-profile';
import type { AuthStatus, AuthUser } from './types';

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Re-reads the Firebase user, e.g. after the email was confirmed (Firebase doesn't fire a state change for that). */
  refresh: () => void;
};

export const AuthContext = createContext<AuthState | null>(null);

configureGoogle();

type Account = { user: AuthUser; verified: boolean };

/** An email-and-password account counts only once its email is confirmed; Google accounts always do. */
export function toAccount(u: User | null): Account | null {
  if (!u) return null;
  const usesPassword = hasPassword(u);
  return {
    user: { uid: u.uid, name: u.displayName, email: u.email, photoUrl: u.photoURL, usesPassword },
    verified: u.emailVerified || !usesPassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebase, setFirebase] = useState<{ loading: boolean; account: Account | null }>({ loading: true, account: null });
  const local = useLocalProfile((s) => s.profile);
  const clearLocal = useLocalProfile((s) => s.clear);

  // The persisted user arrives here even with no internet — that's what keeps Lucid offline-friendly.
  useEffect(() => onAuthStateChanged(getAuth(), (u) => setFirebase({ loading: false, account: toAccount(u) })), []);
  const refresh = useCallback(() => setFirebase({ loading: false, account: toAccount(getAuth().currentUser) }), []);
  const account = firebase.account?.verified ? firebase.account.user : null;

  // Signing in replaces the offline profile, keeping its chats, cards and scores (auth.md §5).
  useEffect(() => {
    if (!account || !local) return;
    try {
      moveUserData(local.uid, account.uid);
    } catch (e) {
      // Keep the profile so its data isn't stranded; the account still wins, and the next app start retries.
      console.warn('Could not move offline data', e instanceof Error ? e.message : e);
      return;
    }
    clearLocal();
  }, [account, local, clearLocal]);

  const state = useMemo((): AuthState => {
    if (firebase.loading) return { status: 'loading', user: null, refresh };
    // Mid-registration the confirm-email screen wins, even over an offline profile.
    if (firebase.account && !firebase.account.verified) return { status: 'unverified', user: firebase.account.user, refresh };
    const user = account ?? local;
    return user ? { status: 'signedIn', user, refresh } : { status: 'signedOut', user: null, refresh };
  }, [firebase, account, local, refresh]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
