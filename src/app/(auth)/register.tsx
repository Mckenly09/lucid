import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AUTH_ERRORS, type ShownAuthError, shownError } from '@/features/auth/errors';
import { passwordChecks, passwordOk } from '@/features/auth/password';
import { useAuth } from '@/features/auth/useAuth';

const RULES = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'letter', label: 'Has a letter' },
  { key: 'number', label: 'Has a number' },
] as const;

/** Create an account (design: auth.png, second screen). Once created, the guards open the confirm-email screen. */
export default function Register() {
  const { registerWithEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ofAge, setOfAge] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ShownAuthError | null>(null);
  const checks = passwordChecks(password);
  const ready = name.trim() !== '' && email.trim() !== '' && passwordOk(password) && ofAge && agreed;

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await registerWithEmail(name, email, password);
    } catch (e) {
      setError(shownError(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      padded={false}
      footer={
        <View className="items-center px-4 pb-6 pt-3">
          <Text tone="muted" className="text-center">
            Already have an account?{' '}
            <Text
              accessibilityRole="link"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
              className="font-semibold underline">
              Log in
            </Text>
          </Text>
        </View>
      }>
      <Header title="Create your account" />
      <View className="gap-4 px-4 pt-2">
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="First and last name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={60}
          returnKeyType="next"
        />
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
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done">
          <View className="gap-1" accessibilityLiveRegion="polite">
            {RULES.map(({ key, label }) => (
              <View
                key={key}
                className="flex-row items-center gap-2"
                accessible
                accessibilityLabel={`${label}: ${checks[key] ? 'done' : 'not yet'}`}>
                <Icon name={checks[key] ? 'Check' : 'Circle'} size={14} tone={checks[key] ? 'success' : 'muted'} />
                <Text variant="caption" tone={checks[key] ? 'success' : 'muted'} className="font-sans">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </TextField>

        <View className="gap-1">
          <Checkbox
            checked={ofAge}
            onChange={setOfAge}
            accessibilityLabel="I'm 18 or older, or my parent or guardian agrees to me using Lucid.">
            I&apos;m 18 or older, <Text variant="small" className="font-semibold">or my parent/guardian agrees</Text> to me
            using Lucid.
          </Checkbox>
          <Checkbox checked={agreed} onChange={setAgreed} accessibilityLabel="I agree to the Terms and Privacy Policy.">
            I agree to the{' '}
            <Text variant="small" accessibilityRole="link" onPress={() => router.push('/settings/privacy')} className="font-semibold underline">
              Terms and Privacy Policy
            </Text>
            .
          </Checkbox>
        </View>

        {error && <Banner status={AUTH_ERRORS[error].status} message={AUTH_ERRORS[error].message} />}
        <Button label="Create account" size="lg" loading={busy} disabled={!ready} onPress={() => void create()} />
      </View>
    </Screen>
  );
}
