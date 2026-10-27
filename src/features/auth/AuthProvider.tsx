import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { createContext, type ReactNode, useEffect, useMemo, useState } from 'react';

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

  // Signing in with Google replaces the offline profile.
  // shortcut: nothing is stored per uid yet; move the local uid's chats and cards to the Google uid once storage lands.
  useEffect(() => {
    if (google.user && local) clearLocal();
  }, [google.user, local, clearLocal]);

  const state = useMemo(() => {
    if (google.loading) return { status: 'loading' as AuthStatus, user: null };
    const user = google.user ?? local;
    return user ? { status: 'signedIn' as AuthStatus, user } : { status: 'signedOut' as AuthStatus, user: null };
  }, [google, local]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
