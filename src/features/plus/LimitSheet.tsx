import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';

import { FREE_DAILY } from './limits';

/** Shown when a free student starts their 6th Quiz me or Practice of the day (subscription.md §6). */
export function LimitSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`You've used today's ${FREE_DAILY} free quizzes.`}>
      <Text tone="muted">They reset tomorrow. Lucid Plus has no daily limit.</Text>
      <View className="mt-6 gap-2">
        <Button
          label="Get Lucid Plus"
          size="lg"
          onPress={() => {
            onClose();
            router.push('/plus');
          }}
        />
        <Button label="Maybe later" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
