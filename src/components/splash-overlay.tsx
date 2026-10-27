import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeOut } from 'react-native-reanimated';

import { Logo } from '@/components/logo';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Takes over from the native splash with the same logo, then fades to reveal the app.
 * Unmounting is what starts the fade, so a failed animation can never leave it covering the screen.
 */
export function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <Animated.View exiting={FadeOut.duration(250).easing(EASE_OUT)} className="absolute inset-0 z-50">
      <View
        className="flex-1 items-center justify-center bg-paper"
        onLayout={() => SplashScreen.hideAsync().finally(() => setVisible(false))}>
        <Logo size="lg" />
      </View>
    </Animated.View>
  );
}
