import { useContext } from 'react';

import { AuthContext } from './AuthProvider';
import { useLocalProfile } from './local-profile';
import { signInWithGoogle, signOut as googleSignOut } from './service';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  const isLocal = ctx.user?.isLocal === true;
  return {
    ...ctx,
    signInWithGoogle,
    continueOffline: (name: string) => useLocalProfile.getState().create(name),
    // An offline profile has no Google session; signing out removes it from this phone.
    signOut: async () => (isLocal ? useLocalProfile.getState().clear() : googleSignOut()),
  };
}
