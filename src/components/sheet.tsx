import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, SlideInDown } from 'react-native-reanimated';

import { KeyboardAvoidingView, SafeAreaView } from '@/components/screen';
import { Text } from '@/components/text';

// Ease-out slide so the sheet arrives fast and settles; Reanimated swaps it for no motion under Reduce Motion.
const ENTER = SlideInDown.duration(280).easing(Easing.out(Easing.cubic));

type Props = { visible: boolean; onClose: () => void; title?: string; children: ReactNode };

/** Bottom sheet for short confirmations and choices. Tap the scrim or press Back to close. */
export function Sheet({ visible, onClose, title, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="absolute inset-0 bg-ink/40 dark:bg-paper/70"
        />
        <Animated.View entering={ENTER} exiting={FadeOut.duration(150)}>
          <SafeAreaView edges={['bottom']} className="rounded-t-lg border-t border-ink/10 bg-paper px-4 pb-4 pt-2">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink/20" />
            {title && (
              <Text variant="h3" accessibilityRole="header" className="mb-1">
                {title}
              </Text>
            )}
            {children}
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
