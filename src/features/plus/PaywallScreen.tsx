import { useNetworkState } from 'expo-network';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextLink } from '@/components/text-link';
import { showToast } from '@/components/toast';

import { usePlus } from './usePlus';

const PERKS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'Zap',
    title: 'Smarter answers',
    body: 'Use the Lucid Plus model on phones that can run it.',
  },
  {
    icon: 'CircleHelp',
    title: 'Unlimited Quiz me & Practice',
    body: 'Free has 5 a day. Plus has no limit.',
  },
  {
    icon: 'Mic',
    title: 'Ask with your voice',
    body: 'Speak in English or Filipino.',
  },
  {
    icon: 'Square',
    title: 'Exam reviewer packs',
    body: 'New review packs as they come out.',
  },
];

/** Design P1. Opened from Settings, the daily-limit sheet, and Plus features; never on its own (subscription.md §6). */
export function PaywallScreen() {
  const plus = usePlus();
  const network = useNetworkState();
  const offline = network.isInternetReachable === false;
  const { load } = plus;

  useEffect(() => {
    void load();
    // Reload when the connection comes back, so the price appears without reopening the paywall.
  }, [load, offline]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const subscribe = async () => {
    if (await plus.buy()) {
      close();
      showToast('Welcome to Lucid Plus');
    }
  };

  const notice = plus.isPlus
    ? {
        status: 'success' as const,
        message: 'Lucid Plus is active on your account.',
      }
    : !plus.available
      ? {
          status: 'warning' as const,
          message: "Subscriptions aren't set up in this build yet.",
        }
      : !plus.canBuy
        ? {
            status: 'default' as const,
            message: 'Sign in with Google in Settings to subscribe. Lucid Plus follows your account.',
          }
        : offline
          ? {
              status: 'warning' as const,
              message: 'Connect to the internet to subscribe.',
            }
          : null;

  const footer = (
    <View className="gap-3 px-4 pb-4 pt-3">
      {plus.isPlus ? (
        <Button label="Done" size="lg" onPress={close} />
      ) : (
        plus.canBuy && (
          <Button
            label={plus.price ? `Subscribe for ${plus.price}/month` : 'Subscribe'}
            size="lg"
            loading={plus.busy}
            disabled={offline || !plus.price}
            onPress={() => void subscribe()}
          />
        )
      )}
      <Text variant="caption" tone="muted" className="text-center">
        Paid through Google Play (card, GCash where available, or load). Renews every month until you cancel in Google
        Play › Subscriptions.{' '}
        <Text variant="caption" className="font-semibold">
          Under 18? Ask a parent first.
        </Text>
      </Text>
      <View className="flex-row items-center justify-center gap-2">
        <TextLink label="Terms" variant="small" tone="muted" onPress={() => router.push('/settings/terms')} />
        <Text variant="small" tone="muted">
          ·
        </Text>
        <TextLink label="Privacy" variant="small" tone="muted" onPress={() => router.push('/settings/privacy')} />
      </View>
    </View>
  );

  return (
    <Screen scroll padded={false} footer={footer}>
      <View className="flex-row items-center justify-between px-2">
        <IconButton icon={<Icon name="X" size={24} />} onPress={close} accessibilityLabel="Close" />
        {plus.canBuy && !plus.isPlus && (
          <View className="pr-2">
            <TextLink label="Restore purchase" disabled={plus.busy || offline} onPress={() => void plus.restore()} />
          </View>
        )}
      </View>

      <View className="gap-6 px-4 pb-6 pt-4">
        <View className="flex-row items-center gap-4">
          <Logo size="auth" />
          <View className="flex-1">
            <Text variant="display" accessibilityRole="header">
              Lucid Plus
            </Text>
            <Text tone="muted">Study more, get smarter answers.</Text>
          </View>
        </View>

        <View className="gap-4">
          {PERKS.map((p) => (
            <View key={p.title} className="flex-row gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-md bg-ink/5">
                <Icon name={p.icon} size={22} />
              </View>
              <View className="flex-1">
                <Text variant="h3">{p.title}</Text>
                <Text tone="muted">{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Banner
          status="success"
          message="Free stays free: asking, flashcards, calculator and periodic table."
          icon={<Icon name="Check" size={20} tone="success" />}
        />

        {notice && <Banner status={notice.status} message={notice.message} />}
        {plus.error && (
          <Banner status="danger" message={plus.error} icon={<Icon name="CircleAlert" size={22} tone="danger" />} />
        )}

        {!plus.isPlus && (
          <View className="flex-row items-center rounded-lg border-2 border-ink p-4">
            <View className="flex-1">
              <Text variant="h3">Monthly</Text>
              <Text variant="small" tone="muted">
                Cancel anytime
              </Text>
            </View>
            {/* The store's localized price only; never a hard-coded amount (subscription.md §7). */}
            <Text variant="h1">{plus.price ?? '…'}</Text>
            <Text tone="muted"> / month</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
