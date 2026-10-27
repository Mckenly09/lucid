import { useState } from 'react';
import { Linking, TextInput, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { RiseIn, STAGGER } from '@/components/rise-in';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { AuthError, type AuthErrorKind } from '@/features/auth/types';
import { useAuth } from '@/features/auth/useAuth';
import { useColor } from '@/hooks/use-color';

// auth.md §5 error table. 'cancelled' shows nothing.
const ERRORS: Record<Exclude<AuthErrorKind, 'cancelled'>, { status: 'warning' | 'danger'; message: string }> = {
  offline: {
    status: 'warning',
    message: 'Connect to the internet once to sign in.',
  },
  'play-services': {
    status: 'warning',
    message: 'Update Google Play Services, then try again.',
  },
  developer: {
    status: 'danger',
    message: __DEV__
      ? 'DEVELOPER_ERROR: check the SHA-1 fingerprints in Firebase and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
      : "Sign-in didn't work. Please try again.",
  },
  other: {
    status: 'danger',
    message: "Sign-in didn't work. Please try again.",
  },
};

// shortcut: not a link until EXPO_PUBLIC_PRIVACY_URL is set; required before release (auth.md §5).
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

export default function SignIn() {
  const { signInWithGoogle, continueOffline } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Exclude<AuthErrorKind, 'cancelled'> | null>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [name, setName] = useState('');
  const placeholderColor = useColor('default');

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
        <View className="gap-6 px-4 pb-8">
          {/* Keyed so a new error fades in instead of swapping text in place */}
          <RiseIn fade key={error ?? 'info'}>
            {error ? (
              <Banner status={ERRORS[error].status} message={ERRORS[error].message} />
            ) : (
              <Banner
                message="You need internet once to sign in. No internet? Continue without an account."
                icon={<Icon name="Wifi" size={20} tone="default" />}
              />
            )}
          </RiseIn>
          <View className="gap-3">
            <Button label="Continue with Google" size="lg" loading={loading} onPress={continueWithGoogle} />
            <Button
              label="Continue without an account"
              variant="ghost"
              disabled={loading}
              onPress={() => setOfflineOpen(true)}
            />
            <Text variant="caption" tone="muted" className="text-center font-sans">
              By continuing you agree to the{' '}
              <Text
                variant="caption"
                tone="primary"
                accessibilityRole={PRIVACY_URL ? 'link' : undefined}
                onPress={PRIVACY_URL ? () => Linking.openURL(PRIVACY_URL) : undefined}
                className="font-semibold underline">
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      }>
      <Header title="Step 1 of 2" subtle />
      <View className="flex-1 items-center justify-center gap-4 px-4">
        <RiseIn>
          <Logo />
        </RiseIn>
        <RiseIn delay={STAGGER}>
          <Text variant="h1" className="text-center" accessibilityRole="header">
            Sign in to keep your progress
          </Text>
        </RiseIn>
        <RiseIn delay={STAGGER * 2} className="items-center">
          <Text tone="muted" className="max-w-75 text-center">
            Your flashcards and quiz scores stay with your account. Your questions stay on your phone.
          </Text>
        </RiseIn>
      </View>

      <Sheet visible={offlineOpen} onClose={() => setOfflineOpen(false)} title="Use Lucid without an account">
        <Text tone="muted">
          Everything stays on this phone. Sign in with Google later to keep your progress with your account.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your first name (optional)"
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Your first name"
          autoCapitalize="words"
          autoComplete="given-name"
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={() => continueOffline(name)}
          className="mt-4 min-h-12 rounded-sm bg-ink/5 px-3 py-3 font-sans text-body text-ink"
        />
        {/* On continue the root layout's guards move on to model setup */}
        <Button label="Continue" size="lg" onPress={() => continueOffline(name)} className="mt-6" />
      </Sheet>
    </Screen>
  );
}
