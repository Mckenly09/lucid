import { Alert, Image, Pressable } from 'react-native';

import { Text } from '@/components/text';

import { useAuth } from '../useAuth';

/** Avatar on the Ask header. Tap to sign out (auth.md: only sign out when the student asks). */
export function AccountButton() {
  const { user, signOut } = useAuth();
  const label = user?.name ?? user?.email ?? 'Your account';

  // shortcut: Alert until a Settings screen exists. Keep/remove local chats prompt comes with chat storage.
  const onPress = () =>
    Alert.alert(label, user?.email ?? undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Account: ${label}`}
      className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-ink/20 bg-ink/5 active:bg-ink/10">
      {user?.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} className="h-full w-full" accessibilityIgnoresInvertColors />
      ) : (
        <Text variant="h3">{label.charAt(0).toUpperCase()}</Text>
      )}
    </Pressable>
  );
}
