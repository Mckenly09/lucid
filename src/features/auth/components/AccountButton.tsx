import { router } from 'expo-router';
import { Image, Pressable, View } from 'react-native';

import { Text } from '@/components/text';

import type { AuthUser } from '../types';
import { useAuth } from '../useAuth';

/** Avatar on the Home and Ask headers; opens Settings, where sign-out and account deletion live. */
export function AccountButton() {
  const { user } = useAuth();
  const label = accountLabel(user);
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel={`Settings. Account: ${label}`}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/10">
      <Avatar user={user} label={label} />
    </Pressable>
  );
}

export const accountLabel = (user: AuthUser | null) =>
  user?.name ?? user?.email ?? (user?.isLocal ? 'Offline profile' : 'Your account');

export function Avatar({ user, label, size = 'sm' }: { user: AuthUser | null; label: string; size?: 'sm' | 'md' }) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full border border-ink/20 bg-primary/10 ${size === 'md' ? 'h-11 w-11' : 'h-8 w-8'}`}>
      {user?.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} className="h-full w-full" accessibilityIgnoresInvertColors />
      ) : (
        <Text variant={size === 'md' ? 'h3' : 'small'} tone="primary" className="font-semibold">
          {label.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
