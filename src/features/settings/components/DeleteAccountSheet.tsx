import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AuthError } from '@/features/auth/types';
import { useAuth } from '@/features/auth/useAuth';

type Props = { visible: boolean; onClose: () => void };

const ITEMS = ['All chats and answers', 'All flashcards and quiz scores', 'Your settings'];

/** App-store-required account deletion (auth.md §5). The AI model stays installed. */
export function DeleteAccountSheet({ visible, onClose }: Props) {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLocal = user?.isLocal === true;
  // Never leave a typed password behind for the next person who opens the sheet on a shared phone.
  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(password || undefined); // the route guard leaves Settings once the account is gone
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'other';
      if (kind === 'offline') setError('Connect to the internet to delete your account.');
      else if (kind === 'needs-password') setError('Enter your password to confirm it’s you.');
      else if (kind === 'wrong-password') setError("That password isn't right. Try again.");
      else if (kind !== 'cancelled') setError("Couldn't delete your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close}>
      <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-danger/10">
        <Icon name="Trash2" size={22} tone="danger" />
      </View>
      <Text variant="h3" accessibilityRole="header">
        Delete your account?
      </Text>
      <Text tone="muted" className="mt-1">
        {isLocal
          ? 'This deletes your offline profile and everything it saved on this phone:'
          : 'This deletes your Lucid account and everything on this phone:'}
      </Text>
      <View className="mt-3 gap-1 rounded-md bg-ink/5 p-3">
        {ITEMS.map((item) => (
          <Text key={item} variant="small">
            • {item}
          </Text>
        ))}
      </View>
      <Text variant="small" tone="muted" className="mt-3">
        The AI model stays installed. <Text variant="small" tone="danger" className="font-semibold">This can&apos;t be undone.</Text>
        {!isLocal && ' You need internet to delete your account.'}
      </Text>
      {user?.usesPassword && (
        <View className="mt-4">
          <TextField
            label="Your password"
            password
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            textContentType="password"
          />
        </View>
      )}
      {error && <Banner status="danger" message={error} className="mt-3" />}
      <View className="mt-6 gap-2">
        <Button label="Delete account" variant="danger" size="lg" loading={busy} onPress={confirm} />
        <Button label="Cancel" variant="ghost" size="lg" disabled={busy} onPress={close} />
      </View>
    </Sheet>
  );
}
