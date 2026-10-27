import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useAuth } from '@/features/auth/useAuth';
import { useColor } from '@/hooks/use-color';

type Props = { visible: boolean; onClose: () => void };

/** Sign out (Google) or remove the offline profile; asks whether to keep this account's data (auth.md §5). */
export function SignOutSheet({ visible, onClose }: Props) {
  const { user, signOut } = useAuth();
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const on = useColor('primary');
  const off = useColor('default');
  const isLocal = user?.isLocal === true;

  const confirm = async () => {
    setBusy(true);
    try {
      await signOut({ keepData: keep }); // the route guard leaves Settings on success
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={isLocal ? 'Remove offline profile?' : 'Sign out?'}>
      <Text tone="muted">
        {isLocal
          ? 'This removes your profile and its chats, cards and quiz scores from this phone. This can’t be undone.'
          : 'You’ll need internet to sign back in.'}
      </Text>
      {!isLocal && (
        <View className="mt-4 flex-row items-center gap-3 rounded-md bg-ink/5 p-3">
          <View className="flex-1">
            <Text className="font-medium">Keep my chats and cards on this phone</Text>
            <Text variant="small" tone="muted">
              Turn off if someone else will use this phone.
            </Text>
          </View>
          <Switch
            value={keep}
            onValueChange={setKeep}
            trackColor={{ true: on, false: off }}
            accessibilityLabel="Keep my chats and cards on this phone"
          />
        </View>
      )}
      <View className="mt-6 flex-row gap-3">
        <Button label="Cancel" variant="secondary" size="lg" className="flex-1" disabled={busy} onPress={onClose} />
        <Button
          label={isLocal ? 'Remove' : 'Sign out'}
          variant={isLocal || !keep ? 'danger' : 'primary'}
          size="lg"
          className="flex-1"
          loading={busy}
          onPress={confirm}
        />
      </View>
    </Sheet>
  );
}
