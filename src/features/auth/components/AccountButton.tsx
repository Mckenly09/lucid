import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';

import { AuthError, type AuthUser } from '../types';
import { useAuth } from '../useAuth';

/** Avatar on the Home and Ask headers. Tap to sign out (auth.md: only sign out when the student asks). */
export function AccountButton() {
  const { user, signOut, signInWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const isLocal = user?.isLocal === true;
  const label = user?.name ?? user?.email ?? (isLocal ? 'Offline profile' : 'Your account');

  // Google replaces the offline profile once it succeeds (AuthProvider).
  const linkGoogle = async () => {
    setLinkError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      setOpen(false);
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'other';
      // auth.md §5 copy; 'cancelled' shows nothing.
      if (kind === 'offline') setLinkError('Connect to the internet once to sign in.');
      else if (kind !== 'cancelled') setLinkError("Sign-in didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // shortcut: sheet until a Settings screen exists. Keep/remove local chats prompt comes with chat storage.
  const confirmSignOut = async () => {
    setBusy(true);
    try {
      await signOut(); // the route guard leaves this screen on success
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Account: ${label}`}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/10">
        <Avatar user={user} label={label} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={isLocal ? 'Offline profile' : 'Sign out?'}>
        <Text tone="muted">
          {isLocal
            ? 'Sign in with Google to keep your progress with your account. Removing this profile can’t be undone.'
            : 'You’ll need internet to sign in again, or you can continue without an account.'}
        </Text>

        <View className="mt-4 flex-row items-center gap-3 rounded-md bg-ink/5 p-3">
          <Avatar user={user} label={label} />
          <View className="flex-1">
            <Text className="font-semibold" numberOfLines={1}>
              {label}
            </Text>
            {user?.email && user.email !== label && (
              <Text variant="small" tone="muted" numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
        </View>

        {linkError && <Banner status="warning" message={linkError} className="mt-4" />}

        <View className="mt-6 gap-2">
          {isLocal && <Button label="Sign in with Google" size="lg" loading={busy} onPress={linkGoogle} />}
          <Button
            label={isLocal ? 'Remove profile' : 'Sign out'}
            variant="danger"
            size="lg"
            loading={busy && !isLocal}
            disabled={busy}
            onPress={confirmSignOut}
          />
          <Button label="Cancel" variant="secondary" size="lg" disabled={busy} onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </>
  );
}

function Avatar({ user, label }: { user: AuthUser | null; label: string }) {
  return (
    <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink/20 bg-primary/10">
      {user?.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} className="h-full w-full" accessibilityIgnoresInvertColors />
      ) : (
        <Text variant="small" tone="primary" className="font-semibold">
          {label.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
