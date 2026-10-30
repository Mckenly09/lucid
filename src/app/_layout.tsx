import '@/global.css';

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { SplashOverlay } from '@/components/splash-overlay';
import { ToastHost } from '@/components/toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth } from '@/features/auth/useAuth';
import { useOnboarding } from '@/features/onboarding/store';
import { usePlusSync } from '@/features/plus/usePlus';
import { useSettings } from '@/features/settings/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <AuthProvider>
        <AppStack />
      </AuthProvider>
    </KeyboardProvider>
  );
}

function AppStack() {
  const colorScheme = useColorScheme();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const unverified = status === 'unverified';
  const onboarded = useOnboarding((s) => s.done);
  const welcomed = useOnboarding((s) => s.welcomed);
  const markWelcomed = useOnboarding((s) => s.markWelcomed);
  usePlusSync();
  // Settings → Appearance; NativeWind and the navigation theme both follow the app's color scheme.
  const appearance = useSettings((s) => s.appearance);
  useEffect(() => Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance), [appearance]);
  // Mark on sign-in, not on "Get started", so Welcome stays reachable until the student actually gets in.
  useEffect(() => {
    if ((signedIn || unverified) && !welcomed) markWelcomed();
  }, [signedIn, unverified, welcomed, markWelcomed]);
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
  });

  // Splash stays up until the overlay mounts and hides it; on font error fall back to system fonts.
  // Auth 'loading' resolves from the persisted user, offline too, so this never waits on the network.
  if ((!fontsLoaded && !fontError) || status === 'loading') return null;

  // Without redirectTo, a guarded route falls back to the first route in filesystem order, which is sign-in, not Welcome.
  const home = unverified
    ? '/verify-email'
    : !signedIn
      ? welcomed
        ? '/sign-in'
        : '/onboarding'
      : !onboarded
        ? '/onboarding/download'
        : '/';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedOut' && !welcomed} redirectTo={home}>
          <Stack.Screen name="onboarding/index" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'} redirectTo={home}>
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(auth)/reset-password" />
        </Stack.Protected>
        {/* Email accounts wait here until the link in the email is tapped. */}
        <Stack.Protected guard={unverified} redirectTo={home}>
          <Stack.Screen name="(auth)/verify-email" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded} redirectTo={home}>
          <Stack.Screen name="onboarding/download" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded} redirectTo={home}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="quiz/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="cards/review" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/model" />
          <Stack.Screen name="settings/electives" />
          <Stack.Screen name="plus" options={{ presentation: 'modal' }} />
          <Stack.Screen name="packs/[id]" />
          <Stack.Screen name="packs/note" />
          <Stack.Screen name="tools/calculator" />
          <Stack.Screen name="tools/periodic-table" />
          <Stack.Screen name="scan/index" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="scan/result" />
          <Stack.Screen name="practice/session" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="practice/results" options={{ presentation: 'fullScreenModal' }} />
        </Stack.Protected>
        {/* Not guarded: sign-in links to the privacy policy and terms before the student has an account. */}
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/terms" />
      </Stack>
      <ToastHost />
      <SplashOverlay />
    </ThemeProvider>
  );
}
