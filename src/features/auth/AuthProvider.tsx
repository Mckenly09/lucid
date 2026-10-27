import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { createContext, type ReactNode, useEffect, useState } from 'react';

import { configureGoogle } from './google';
import type { AuthStatus, AuthUser } from './types';

export const AuthContext = createContext<{ status: AuthStatus; user: AuthUser | null } | null>(null);

configureGoogle();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: AuthUser | null }>({
    status: 'loading',
    user: null,
  });

  // The persisted user arrives here even with no internet — that's what keeps Lucid offline-friendly.
  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (u) =>
        setState(
          u
            ? {
                status: 'signedIn',
                user: { uid: u.uid, name: u.displayName, email: u.email, photoUrl: u.photoURL },
              }
            : { status: 'signedOut', user: null },
        ),
      ),
    [],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
