import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Switch, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Icon, type IconName } from '@/components/icon';
import { ListItem } from '@/components/list-item';
import { formatSize } from '@/components/model-card';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { AuthError } from '@/features/auth/types';
import { accountLabel, Avatar } from '@/features/auth/components/AccountButton';
import { useAuth } from '@/features/auth/useAuth';
import { exportBackup, importBackup, pickBackup } from '@/features/backup/backup';
import type { BackupData } from '@/features/backup/services/backup';
import { cancelReminder, REMINDER_HOUR, scheduleReminder } from '@/features/flashcards/reminder';
import { useModels } from '@/features/models/store';
import { usePlus } from '@/features/plus/usePlus';
import { ChoiceSheet } from '@/features/settings/components/ChoiceSheet';
import { DeleteAccountSheet } from '@/features/settings/components/DeleteAccountSheet';
import { SignOutSheet } from '@/features/settings/components/SignOutSheet';
import { type AnswerLanguage, type Appearance, useSettings } from '@/features/settings/store';
import { useColor } from '@/hooks/use-color';
import { modelById } from '@/llm/models';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';

const SUBJECT_OPTIONS: { id: SubjectId | 'auto'; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  ...SUBJECTS.filter((s) => s.id !== 'general').map((s) => ({ id: s.id, label: s.short })),
];
const LANGUAGE_OPTIONS: { id: AnswerLanguage; label: string }[] = [
  { id: 'same', label: 'Same as question' },
  { id: 'english', label: 'English' },
  { id: 'filipino', label: 'Filipino' },
];
const APPEARANCE_OPTIONS: { id: Appearance; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];
const labelOf = <T extends string>(options: { id: T; label: string }[], id: T) => options.find((o) => o.id === id)?.label ?? '';
const MB = 1024 ** 2;

type Open = 'subject' | 'language' | 'appearance' | 'signOut' | 'delete' | null;

export default function Settings() {
  const { user, signInWithGoogle } = useAuth();
  const settings = useSettings();
  const installedId = useModels((s) => s.installedId);
  const plus = usePlus();
  const endDate = plus.expiresAt && new Date(plus.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const plusValue = !plus.isPlus
    ? 'Free · Upgrade'
    : endDate
      ? `Active · ${plus.willRenew ? 'renews' : 'ends'} ${endDate}`
      : 'Active';
  const switchOn = useColor('primary');
  const switchOff = useColor('default');
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  // A checked backup waiting for "Add to your data" — Import never writes without asking.
  const [pending, setPending] = useState<BackupData | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const isLocal = user?.isLocal === true;
  const label = accountLabel(user);
  const model = installedId ? modelById(installedId) : null;

  const toggleReminder = async (on: boolean) => {
    setNotice(null);
    if (!on) {
      settings.set({ reminder: false });
      await cancelReminder();
      return;
    }
    if (user && (await scheduleReminder(user.uid))) settings.set({ reminder: true });
    else setNotice('Allow notifications for Lucid in your phone settings to get card reminders.');
  };

  // Google replaces the offline profile once it succeeds, keeping its data (AuthProvider).
  const linkGoogle = async () => {
    setNotice(null);
    setLinking(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const kind = e instanceof AuthError ? e.kind : 'other';
      if (kind === 'offline') setNotice('Connect to the internet once to sign in.');
      else if (kind !== 'cancelled') setNotice("Sign-in didn't work. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const runExport = async () => {
    if (!user) return;
    setNotice(null);
    setImported(null);
    setBackupBusy(true);
    try {
      await exportBackup(user.uid);
    } catch {
      setNotice("Couldn't make the backup file. Please try again.");
    } finally {
      setBackupBusy(false);
    }
  };

  const runPick = async () => {
    setNotice(null);
    setImported(null);
    setBackupBusy(true);
    try {
      const picked = await pickBackup();
      if (!picked) return;
      if ('error' in picked) {
        setNotice(picked.error === 'too-big' ? 'That file is too big to be a Lucid backup.' : "That file isn't a Lucid backup.");
        return;
      }
      setPending(picked.data);
    } catch {
      setNotice("Couldn't read that file. Please try again.");
    } finally {
      setBackupBusy(false);
    }
  };

  const runImport = () => {
    if (!user || !pending) return;
    try {
      importBackup(user.uid, pending);
      setImported(`Added ${countLabel(pending)}.`);
    } catch {
      setNotice("Couldn't add the backup. Nothing was changed.");
    }
    setPending(null);
  };

  return (
    <Screen scroll padded={false}>
      <Header title="Settings" />
      <View className="gap-6 px-4 pb-8 pt-2">
        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <Avatar user={user} label={label} size="md" />
            <View className="flex-1">
              <Text className="font-semibold" numberOfLines={1}>
                {label}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {isLocal ? 'Offline profile · this phone only' : `${user?.email ?? ''} · Google`}
              </Text>
            </View>
          </View>
          {isLocal && (
            <Button label="Sign in with Google" variant="secondary" loading={linking} onPress={linkGoogle} />
          )}
        </Card>

        {imported && <Banner status="success" message={imported} icon={<Icon name="CircleCheck" size={22} tone="success" />} />}
        {notice && <Banner status="warning" message={notice} icon={<Icon name="TriangleAlert" size={22} tone="warning" />} />}

        <Group title="Study">
          <Row
            icon="Book"
            label="Default subject"
            value={settings.defaultSubject === 'auto' ? 'Auto' : subject(settings.defaultSubject).short}
            onPress={() => setOpen('subject')}
          />
          <Row
            icon="Languages"
            label="Answer language"
            value={labelOf(LANGUAGE_OPTIONS, settings.answerLanguage)}
            onPress={() => setOpen('language')}
          />
          <Row
            icon="BookOpen"
            label="My electives"
            value={settings.electives.length ? `${settings.electives.length} picked` : 'None'}
            onPress={() => router.push('/settings/electives')}
          />
          {/* A plain row, not ListItem: a pressable parent would hide the Switch from screen readers. */}
          <View className="min-h-11 flex-row items-center gap-3 border-b border-ink/10 py-3">
            <Icon name="Bell" size={20} tone="muted" />
            <Text className="flex-1 font-medium" numberOfLines={1}>
              Card reminder · {REMINDER_HOUR - 12}:00 PM
            </Text>
            <Switch
              value={settings.reminder}
              onValueChange={(on) => void toggleReminder(on)}
              trackColor={{ true: switchOn, false: switchOff }}
              accessibilityLabel={`Daily card reminder at ${REMINDER_HOUR - 12} PM`}
            />
          </View>
        </Group>

        <Group title="AI & storage">
          <Row icon="Zap" label="Lucid Plus" value={plusValue} onPress={() => router.push('/plus')} />
          {plus.status === 'lapsed' && (
            <Banner
              status="warning"
              message="Connect once to keep Lucid Plus active."
              icon={<Icon name="WifiOff" size={22} tone="warning" />}
              className="mt-3"
            />
          )}
          <Row icon="Cpu" label="AI model" value={model?.name ?? 'Not downloaded'} onPress={() => router.push('/settings/model')} />
          <Row
            icon="HardDrive"
            label="Storage"
            value={model ? `${formatSize(model.sizeBytes / MB)} used` : ''}
            onPress={() => router.navigate('/library')}
          />
        </Group>

        <Group title="Your data">
          <Row icon="Download" label="Export my data" value={backupBusy ? 'Working…' : ''} onPress={backupBusy ? undefined : () => void runExport()} />
          <Row icon="Upload" label="Import a backup" value={backupBusy ? 'Working…' : ''} onPress={backupBusy ? undefined : () => void runPick()} />
        </Group>

        <Group title="App">
          <Row
            icon="Sun"
            label="Appearance"
            value={labelOf(APPEARANCE_OPTIONS, settings.appearance)}
            onPress={() => setOpen('appearance')}
          />
          <Row icon="Shield" label="Privacy" onPress={() => router.push('/settings/privacy')} />
          <Row icon="BookOpen" label="Terms and conditions" onPress={() => router.push('/settings/terms')} />
          <Row icon="Info" label="About Lucid" value={`v${Constants.expoConfig?.version ?? '1.0.0'}`} />
        </Group>

        <View className="gap-2">
          <Button
            label={isLocal ? 'Remove offline profile' : 'Sign out'}
            variant="secondary"
            size="lg"
            onPress={() => setOpen('signOut')}
          />
          <Button label="Delete account and data" variant="ghost" onPress={() => setOpen('delete')} />
        </View>
      </View>

      <ChoiceSheet
        title="Default subject"
        visible={open === 'subject'}
        value={settings.defaultSubject}
        options={SUBJECT_OPTIONS}
        onPick={(defaultSubject) => settings.set({ defaultSubject })}
        onClose={() => setOpen(null)}
      />
      <ChoiceSheet
        title="Answer language"
        visible={open === 'language'}
        value={settings.answerLanguage}
        options={LANGUAGE_OPTIONS}
        onPick={(answerLanguage) => settings.set({ answerLanguage })}
        onClose={() => setOpen(null)}
      />
      <ChoiceSheet
        title="Appearance"
        visible={open === 'appearance'}
        value={settings.appearance}
        options={APPEARANCE_OPTIONS}
        onPick={(appearance) => settings.set({ appearance })}
        onClose={() => setOpen(null)}
      />
      <Sheet visible={!!pending} onClose={() => setPending(null)} title="Add to your data?">
        {pending && (
          <View className="gap-4 pt-1">
            <Text tone="muted">
              {`This backup has ${countLabel(pending)}. They'll be added to what's already on this phone. Nothing is replaced.`}
            </Text>
            <View className="flex-row gap-2">
              <Button label="Cancel" variant="secondary" onPress={() => setPending(null)} className="flex-1" />
              <Button label="Add to your data" onPress={runImport} className="flex-1" />
            </View>
          </View>
        )}
      </Sheet>
      <SignOutSheet visible={open === 'signOut'} onClose={() => setOpen(null)} />
      <DeleteAccountSheet visible={open === 'delete'} onClose={() => setOpen(null)} />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text variant="label" className="mb-1">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) {
  return (
    <ListItem
      title={label}
      left={<Icon name={icon} size={20} tone="muted" />}
      onPress={onPress}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      right={
        <View className="flex-row items-center gap-1">
          {!!value && (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {value}
            </Text>
          )}
          {onPress && <Icon name="ChevronRight" size={18} tone="muted" />}
        </View>
      }
    />
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const countLabel = (d: BackupData) =>
  [plural(d.chats.length, 'chat'), plural(d.cards.length, 'card'), plural(d.quizResults.length, 'quiz score'), plural(d.userPacks.length, 'pack')].join(', ');
