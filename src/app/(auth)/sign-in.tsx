import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import { RiseIn, STAGGER } from '@/components/rise-in';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { AUTH_ERRORS, type ShownAuthError, shownError } from '@/features/auth/errors';
import { useAuth } from '@/features/auth/useAuth';
import { useColor } from '@/hooks/use-color';

/** Log in (design: auth.png, first screen). On success the root layout's guards move on. */
export default function SignIn() {
  const { signInWithEmail, signInWithGoogle, continueOffline } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<ShownAuthError | null>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [name, setName] = useState('');
  const placeholderColor = useColor('default');
  const canLogIn = email.trim() !== '' && password !== '';

  const run = async (kind: 'email' | 'google', signIn: () => Promise<unknown>) => {
    setError(null);
    setBusy(kind);
    try {
      await signIn();
    } catch (e) {
      setError(shownError(e));
      setBusy(null);
    }
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="items-center gap-2 px-4 pb-6 pt-3">
          <View className="flex-row flex-wrap items-center justify-center gap-1">
            <Text tone="muted">New to Lucid?</Text>
            <TextLink label="Create an account" onPress={() => router.push('/register')} />
          </View>
          <Text variant="caption" tone="muted" className="text-center font-sans">
            You need internet to log in once. After that, Lucid works offline.
          </Text>
        </View>
      }>
      <Header title="Step 1 of 2" subtle />
      <View className="gap-6 px-4 pt-4">
        <RiseIn className="gap-3">
          <Logo size="auth" />
          <Text variant="h1" accessibilityRole="header">
            Log in to Lucid
          </Text>
          <Text tone="muted">Keep your cards and quiz scores with your account.</Text>
        </RiseIn>

        <RiseIn delay={STAGGER} className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            password
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => canLogIn && void run('email', () => signInWithEmail(email, password))}
            labelRight={
              <TextLink
                label="Forgot password?"
                variant="small"
                tone="muted"
                onPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } })}
              />
            }
          />
          {/* Keyed so a new error fades in instead of swapping text in place */}
          {error && (
            <RiseIn fade key={error}>
              <Banner status={AUTH_ERRORS[error].status} message={AUTH_ERRORS[error].message} />
            </RiseIn>
          )}
          <Button
            label="Log in"
            size="lg"
            loading={busy === 'email'}
            disabled={!canLogIn || busy === 'google'}
            onPress={() => void run('email', () => signInWithEmail(email, password))}
          />
        </RiseIn>

        <RiseIn delay={STAGGER * 2} className="gap-3">
          <View className="flex-row items-center gap-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View className="h-px flex-1 bg-ink/10" />
            <Text variant="caption" tone="muted" className="font-sans">
              or
            </Text>
            <View className="h-px flex-1 bg-ink/10" />
          </View>
          <Button
            label="Continue with Google"
            variant="outline"
            size="lg"
            loading={busy === 'google'}
            disabled={busy === 'email'}
            onPress={() => void run('google', signInWithGoogle)}
          />
          {/* Not in the design, but students with no internet need it (auth.md §5 offline profile). */}
          <Button label="Continue without an account" variant="ghost" disabled={busy !== null} onPress={() => setOfflineOpen(true)} />
          <Text variant="caption" tone="muted" className="text-center font-sans">
            By continuing you agree to the{' '}
            <Text
              variant="caption"
              tone="primary"
              accessibilityRole="link"
              onPress={() => router.push('/settings/privacy')}
              className="font-semibold underline">
              Privacy Policy
            </Text>
            .
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
