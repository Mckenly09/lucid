import { useContext } from 'react';

import { deleteUserData } from '@/db/user-data';
import { useChat } from '@/features/chat/store';
import { cancelReminder } from '@/features/flashcards/reminder';
import { useSettings } from '@/features/settings/store';

import { AuthContext } from './AuthProvider';
import { useLocalProfile } from './local-profile';
import { deleteAccount, signInWithGoogle, signOut as googleSignOut } from './service';

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
    continueOffline: (name: string) => useLocalProfile.getState().create(name),
    /**
     * `keepData: false` removes this account's chats and cards first (auth.md §5: ask on sign-out).
     * An offline profile has no Google session; removing it always removes its data, since nothing can reach it again.
     */
    signOut: async ({ keepData = true }: { keepData?: boolean } = {}) => {
      useChat.getState().stop();
      if (uid && (isLocal || !keepData)) wipe(uid);
      if (isLocal) useLocalProfile.getState().clear();
      else await googleSignOut();
    },
    /** Deletes the Google account (needs internet), then everything this account left on the phone. The model stays. */
    deleteAccount: async () => {
      useChat.getState().stop();
      if (!isLocal) await deleteAccount();
      if (uid) wipe(uid);
      useSettings.getState().reset();
      await cancelReminder();
      if (isLocal) useLocalProfile.getState().clear();
    },
  };
}
