import { createContext, type ReactNode, useSyncExternalStore } from 'react';

import { useOnboarding } from '@/features/onboarding/store';

import type { AuthStatus, AuthUser } from './types';

// On web, './AuthProvider' resolves to this file, so the context lives here too.
export const AuthContext = createContext<{ status: AuthStatus; user: AuthUser | null } | null>(null);

const LOADING = { status: 'loading' as AuthStatus, user: null };
const SIGNED_OUT = { status: 'signedOut' as AuthStatus, user: null };
const SIGNED_IN = {
  status: 'signedIn' as AuthStatus,
  user: { uid: 'preview', name: 'Juan Dela Cruz', email: 'juan@example.com', photoUrl: null },
};

// Web is a design preview only (React Native Firebase is native-only).
// ?as=new → signed out, ?as=setup → model setup, anything else → signed in with tabs.
function readPreview() {
  const as = new URLSearchParams(window.location.search).get('as');
  if (as !== 'new' && as !== 'setup') useOnboarding.getState().finish();
  return as === 'new' ? SIGNED_OUT : SIGNED_IN;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Server snapshot is 'loading' so the server render and first client render match.
  const state = useSyncExternalStore(
    () => () => {},
    readPreview,
    () => LOADING,
  );
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
