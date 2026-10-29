import { createContext, type ReactNode, useSyncExternalStore } from 'react';

import { useOnboarding } from '@/features/onboarding/store';

import type { AuthState } from './AuthProvider';

// On web, './AuthProvider' resolves to this file, so the context lives here too.
export const AuthContext = createContext<AuthState | null>(null);

const refresh = () => {};
const PREVIEW_USER = { uid: 'preview', name: 'Juan Dela Cruz', email: 'juan@example.com', photoUrl: null };
const LOADING: AuthState = { status: 'loading', user: null, refresh };
const SIGNED_OUT: AuthState = { status: 'signedOut', user: null, refresh };
const UNVERIFIED: AuthState = { status: 'unverified', user: PREVIEW_USER, refresh };
const SIGNED_IN: AuthState = { status: 'signedIn', user: PREVIEW_USER, refresh };

// Web is a design preview only (React Native Firebase is native-only).
// ?as=new → signed out, ?as=verify → confirm-email screen, ?as=setup → model setup, anything else → signed in with tabs.
function readPreview() {
  const as = new URLSearchParams(window.location.search).get('as');
  if (as !== 'new' && as !== 'setup' && as !== 'verify') useOnboarding.getState().finish();
  return as === 'new' ? SIGNED_OUT : as === 'verify' ? UNVERIFIED : SIGNED_IN;
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
