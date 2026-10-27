import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { createContext, type ReactNode, useEffect, useMemo, useState } from 'react';

import { moveUserData } from '@/db/user-data';

import { configureGoogle } from './google';
import { useLocalProfile } from './local-profile';
import type { AuthStatus, AuthUser } from './types';

export const AuthContext = createContext<{ status: AuthStatus; user: AuthUser | null } | null>(null);

configureGoogle();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [google, setGoogle] = useState<{ loading: boolean; user: AuthUser | null }>({ loading: true, user: null });
  const local = useLocalProfile((s) => s.profile);
  const clearLocal = useLocalProfile((s) => s.clear);

  // The persisted user arrives here even with no internet — that's what keeps Lucid offline-friendly.
  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (u) =>
        setGoogle({
          loading: false,
          user: u ? { uid: u.uid, name: u.displayName, email: u.email, photoUrl: u.photoURL } : null,
        }),
      ),
    [],
  );

  // Signing in with Google replaces the offline profile, keeping its chats, cards and scores (auth.md §5).
  useEffect(() => {
    if (!google.user || !local) return;
    try {
      moveUserData(local.uid, google.user.uid);
    } catch (e) {
      // Keep the profile so its data isn't stranded; the Google user still wins, and the next app start retries.
      console.warn('Could not move offline data', e instanceof Error ? e.message : e);
      return;
    }
    clearLocal();
  }, [google.user, local, clearLocal]);

  const state = useMemo(() => {
    if (google.loading) return { status: 'loading' as AuthStatus, user: null };
    const user = google.user ?? local;
    return user ? { status: 'signedIn' as AuthStatus, user } : { status: 'signedOut' as AuthStatus, user: null };
  }, [google, local]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
