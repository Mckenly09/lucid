import { useContext } from 'react';

import { deleteUserData } from '@/db/user-data';
import { useChat } from '@/features/chat/store';
import { cancelReminder } from '@/features/flashcards/reminder';
import { useSettings } from '@/features/settings/store';

import { AuthContext } from './AuthProvider';
import { useLocalProfile } from './local-profile';
import {
  cancelRegistration,
  checkVerified,
  deleteAccount,
  registerWithEmail,
  resendVerification,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOut as firebaseSignOut,
  verificationSentAt,
} from './service';

/** Removes this account's chats, cards and scores from the phone, and from memory. */
function wipe(uid: string) {
  deleteUserData(uid);
  useChat.setState({ chats: {} });
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  const uid = ctx.user?.uid;
  const isLocal = ctx.user?.isLocal === true;
  return {
    ...ctx,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail: async (name: string, email: string, password: string) => {
      await registerWithEmail(name, email, password);
      ctx.refresh(); // picks up the saved name
    },
    resendVerification,
    verificationSentAt,
    resetPassword,
    /** True once the email is confirmed; the route guards then move on. */
    checkVerified: async () => {
      const verified = await checkVerified();
      if (verified) ctx.refresh();
      return verified;
    },
    cancelRegistration,
    continueOffline: (name: string) => useLocalProfile.getState().create(name),
    /**
     * `keepData: false` removes this account's chats and cards first (auth.md §5: ask on sign-out).
     * An offline profile has no Firebase session; removing it always removes its data, since nothing can reach it again.
     */
    signOut: async ({ keepData = true }: { keepData?: boolean } = {}) => {
      useChat.getState().stop();
      if (uid && (isLocal || !keepData)) wipe(uid);
      if (isLocal) useLocalProfile.getState().clear();
      else await firebaseSignOut();
    },
    /**
     * Deletes the account (needs internet), then everything it left on the phone. The model stays.
     * `password` re-confirms an email account when Firebase asks for a fresh sign-in.
     */
    deleteAccount: async (password?: string) => {
      useChat.getState().stop();
      if (!isLocal) await deleteAccount(password);
      if (uid) wipe(uid);
      useSettings.getState().reset();
      await cancelReminder();
      if (isLocal) useLocalProfile.getState().clear();
    },
  };
}
