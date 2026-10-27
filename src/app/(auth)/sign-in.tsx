import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { AuthError, type AuthErrorKind } from '@/features/auth/types';
import { useAuth } from '@/features/auth/useAuth';

// auth.md §5 error table. 'cancelled' shows nothing.
const ERRORS: Record<Exclude<AuthErrorKind, 'cancelled'>, { status: 'warning' | 'danger'; message: string }> = {
  offline: { status: 'warning', message: 'Connect to the internet once to sign in.' },
  'play-services': { status: 'warning', message: 'Update Google Play Services, then try again.' },
  developer: {
    status: 'danger',
    message: __DEV__
      ? 'DEVELOPER_ERROR: check the SHA-1 fingerprints in Firebase and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
      : "Sign-in didn't work. Please try again.",
  },
  other: { status: 'danger', message: "Sign-in didn't work. Please try again." },
};

// shortcut: not a link until EXPO_PUBLIC_PRIVACY_URL is set; required before release (auth.md §5).
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

export default function SignIn() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Exclude<AuthErrorKind, 'cancelled'> | null>(null);

  // On success the root layout's guards move on to the download step.
  const continueWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'other';
      if (kind !== 'cancelled') setError(kind);
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="gap-4 px-4 pb-2">
          {error ? (
            <Banner status={ERRORS[error].status} message={ERRORS[error].message} />
          ) : (
            <View className="flex-row items-center gap-4 rounded-lg border border-ink/10 bg-ink/5 p-4">
              <Icon ios="wifi" android="wifi" size={20} className="text-ink/60" />
              <Text className="flex-1">You need internet once to sign in. After that, Lucid works offline.</Text>
            </View>
          )}
          <Button label="Continue with Google" size="lg" loading={loading} onPress={continueWithGoogle} />
          <Text variant="small" tone="muted" className="text-center">
            By continuing you agree to the{' '}
            <Text
              variant="small"
              accessibilityRole={PRIVACY_URL ? 'link' : undefined}
              onPress={PRIVACY_URL ? () => Linking.openURL(PRIVACY_URL) : undefined}
              className="font-semibold underline">
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      }>
      <Header title="Step 1 of 2" subtle />
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <Logo />
        <Text variant="h1" className="text-center text-display" accessibilityRole="header">
          Sign in to keep your progress
        </Text>
        <Text variant="h3" tone="muted" className="text-center font-sans">
          Your flashcards and quiz scores stay with your account. Your questions stay on your phone.
        </Text>
      </View>
    </Screen>
  );
}
