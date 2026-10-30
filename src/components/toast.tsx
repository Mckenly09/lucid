import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { create } from 'zustand';

import { SafeAreaView } from '@/components/screen';
import { Text } from '@/components/text';

const SHOW_MS = 2500;

const useToast = create<{ message: string | null; at: number }>(() => ({
  message: null,
  at: 0,
}));

/** Shows a short message over whatever screen is on top, e.g. after a modal closes. */
export function showToast(message: string) {
  useToast.setState({ message, at: Date.now() });
  AccessibilityInfo.announceForAccessibility(message);
}

/** Mount once, at the root, after the navigator. */
export function ToastHost() {
  const { message, at } = useToast();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => useToast.setState({ message: null }), SHOW_MS);
    return () => clearTimeout(t);
  }, [message, at]);

  if (!message) return null;
  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="none"
      className="absolute inset-x-0 bottom-0 items-center px-4 pb-12">
      <Animated.View key={at} entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)}>
        <View className="rounded-full bg-primary px-4 py-3">
          <Text variant="small" className="font-semibold text-paper">
            {message}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
