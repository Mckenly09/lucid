import { useContext } from 'react';

import { AuthContext } from './AuthProvider';
import { signInWithGoogle, signOut } from './service';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return { ...ctx, signInWithGoogle, signOut };
}
