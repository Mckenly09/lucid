import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextLink } from '@/components/text-link';
import { AUTH_ERRORS, shownError } from '@/features/auth/errors';
import { useAuth } from '@/features/auth/useAuth';

/** Seconds between confirmation emails, so a student can't spam Firebase (it rate-limits anyway). */
const RESEND_WAIT_S = 45;

const secondsLeft = (sentAt: number) => Math.max(0, Math.ceil(RESEND_WAIT_S - (Date.now() - sentAt) / 1000));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Confirm your email (design: auth.png, third screen). Shown while an email account is `unverified`. */
export default function VerifyEmail() {
  const { user, checkVerified, resendVerification, cancelRegistration, signOut, verificationSentAt } = useAuth();
  const [wait, setWait] = useState(() => secondsLeft(verificationSentAt()));
  const [busy, setBusy] = useState<'check' | 'resend' | 'change' | null>(null);
  const [notice, setNotice] = useState<{ status: 'success' | 'warning' | 'danger'; message: string } | null>(null);

  // Ticks the whole time: right after registering this screen can open before the email has gone out.
  useEffect(() => {
    const timer = setInterval(() => setWait(secondsLeft(verificationSentAt())), 1000);
    return () => clearInterval(timer);
  }, [verificationSentAt]);

  const fail = (e: unknown) => {
    const kind = shownError(e);
    if (kind) setNotice({ status: AUTH_ERRORS[kind].status, message: AUTH_ERRORS[kind].message });
  };

  // On success the guards move on to model setup.
  const confirm = async () => {
    setNotice(null);
    setBusy('check');
    try {
      if (!(await checkVerified())) setNotice({ status: 'warning', message: 'Not confirmed yet. Tap the link in the email first.' });
    } catch (e) {
      fail(e);
    }
    setBusy(null);
  };

  const resend = async () => {
    setNotice(null);
    setBusy('resend');
    try {
      await resendVerification();
      setNotice({ status: 'success', message: 'Sent again. It can take a minute to arrive.' });
      setWait(secondsLeft(verificationSentAt()));
    } catch (e) {
      fail(e);
    }
    setBusy(null);
  };

  // Removes the unconfirmed account; the guards then go back to Log in.
  const change = async () => {
    setBusy('change');
    await cancelRegistration();
  };

  return (
    <Screen
      footer={
        <View className="gap-3 px-4 pb-6 pt-3">
          <Banner message="Can't find it? Check your spam or promotions folder." icon={<Icon name="Info" size={20} tone="muted" />} />
          <Button label="I've confirmed it — continue" size="lg" loading={busy === 'check'} disabled={busy !== null && busy !== 'check'} onPress={() => void confirm()} />
          <Button
            label={wait > 0 ? `Resend email in ${clock(wait)}` : 'Resend email'}
            variant="secondary"
            size="lg"
            loading={busy === 'resend'}
            disabled={wait > 0 || (busy !== null && busy !== 'resend')}
            onPress={() => void resend()}
          />
        </View>
      }>
      {/* Back keeps the account: logging in again returns here until the email is confirmed. */}
      <Header title="Step 1 of 2" subtle onBack={() => void signOut()} />
      <View className="flex-1 items-center justify-center gap-4 px-4">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-ink/10">
          <Icon name="Mail" size={36} />
        </View>
        <Text variant="h2" accessibilityRole="header" className="text-center">
          Check your email
        </Text>
        <Text tone="muted" className="text-center">
          We sent a link to{'\n'}
          <Text className="font-semibold">{user?.email}</Text>
          {'\n'}Tap it to confirm your account, then come back here.
        </Text>
        <TextLink label="Wrong email? Change it" variant="small" disabled={busy !== null} onPress={() => void change()} />
        {notice && <Banner status={notice.status} message={notice.message} className="self-stretch" />}
      </View>
    </Screen>
  );
}
