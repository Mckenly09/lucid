import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AUTH_ERRORS, type ShownAuthError, shownError } from '@/features/auth/errors';
import { useAuth } from '@/features/auth/useAuth';

/** Reset your password (design: auth.png, fourth screen). Opened from Log in, with its email filled in. */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<ShownAuthError | null>(null);

  const send = async () => {
    setError(null);
    setSentTo(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSentTo(email.trim());
    } catch (e) {
      setError(shownError(e));
    }
    setBusy(false);
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="px-4 pb-6 pt-3">
          <Button
            label="Back to log in"
            variant="secondary"
            size="lg"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
          />
        </View>
      }>
      <Header />
      <View className="gap-4 px-4 pt-2">
        <View className="h-14 w-14 items-center justify-center rounded-md bg-ink/10">
          <Icon name="KeyRound" size={26} />
        </View>
        <View className="gap-2">
          <Text variant="h1" accessibilityRole="header">
            Reset your password
          </Text>
          <Text tone="muted">Enter the email you used for Lucid. We&apos;ll send you a link to make a new password.</Text>
        </View>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => email.trim() && void send()}
        />
        <Button label="Send reset link" size="lg" loading={busy} disabled={!email.trim()} onPress={() => void send()} />
        <View accessibilityLiveRegion="polite">
          {sentTo && (
            <Banner
              status="success"
              title="Check your email"
              message={`If an account uses ${sentTo}, a reset link is on its way. Check your spam folder too.`}
              icon={<Icon name="CircleCheck" size={20} tone="success" />}
            />
          )}
          {error && <Banner status={AUTH_ERRORS[error].status} message={AUTH_ERRORS[error].message} />}
        </View>
      </View>
    </Screen>
  );
}
