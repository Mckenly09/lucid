import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text, type TextTone, type TextVariant } from '@/components/text';
import { useAuth } from '@/features/auth/useAuth';
import { askNow } from '@/features/chat/ask-now';
import { calculate, type CalcKey, EMPTY, explainQuestion, press } from '@/features/tools/services/calc';

type Kind = 'num' | 'op' | 'fn' | 'eq' | 'sci';
type KeyDef = { label: string; a11y: string; key: CalcKey; kind: Kind };

const k = (label: string, key: CalcKey, kind: Kind, a11y = label): KeyDef => ({ label, key, kind, a11y });
const ins = (label: string, text = label, a11y = label) => k(label, { type: 'insert', text }, label === '.' || /\d/.test(label) ? 'num' : 'sci', a11y);
const op = (label: '+' | '−' | '×' | '÷', a11y: string) => k(label, { type: 'operator', text: label }, 'op', a11y);

const SCIENTIFIC: KeyDef[] = [
  ins('sin', 'sin(', 'sine'),
  ins('cos', 'cos(', 'cosine'),
  ins('tan', 'tan(', 'tangent'),
  ins('log', 'log(', 'log base 10'),
  ins('ln', 'ln(', 'natural log'),
  ins('√', '√(', 'square root'),
  k('x²', { type: 'operator', text: '²' }, 'sci', 'square'),
  k('xʸ', { type: 'operator', text: '^' }, 'sci', 'power'),
  ins('π', 'π', 'pi'),
  k('( )', { type: 'paren' }, 'sci', 'parentheses'),
];

const NUMBERS: KeyDef[] = [
  k('AC', { type: 'clear' }, 'fn', 'all clear'),
  k('⌫', { type: 'delete' }, 'fn', 'delete'),
  k('%', { type: 'operator', text: '%' }, 'fn', 'percent'),
  op('÷', 'divide'),
  ...['7', '8', '9'].map((d) => ins(d)),
  op('×', 'multiply'),
  ...['4', '5', '6'].map((d) => ins(d)),
  op('−', 'minus'),
  ...['1', '2', '3'].map((d) => ins(d)),
  op('+', 'plus'),
  k('Ans', { type: 'insert', text: 'Ans' }, 'fn', 'previous answer'),
  ins('0'),
  ins('.', '.', 'decimal point'),
  k('=', { type: 'equals' }, 'eq', 'equals'),
];

// Design T1: number keys lightest, operators tinted, "=" solid primary.
const KEY_STYLE: Record<Kind, { box: string; variant: TextVariant; tone: TextTone }> = {
  num: { box: 'min-h-14 bg-ink/10 active:bg-ink/20', variant: 'h2', tone: 'ink' },
  op: { box: 'min-h-14 bg-primary/10 active:bg-primary/20', variant: 'h2', tone: 'primary' },
  fn: { box: 'min-h-14 bg-ink/5 active:bg-ink/10', variant: 'h3', tone: 'ink' },
  eq: { box: 'min-h-14 bg-primary active:bg-primary/80', variant: 'h2', tone: 'paper' },
  sci: { box: 'min-h-11 bg-ink/5 active:bg-ink/10', variant: 'mono', tone: 'ink' },
};

const rows = (keys: KeyDef[], size: number) => Array.from({ length: keys.length / size }, (_, i) => keys.slice(i * size, i * size + size));

/** Scientific calculator, offline (design T1). "Explain step by step" asks Lucid in a Math chat. */
export default function Calculator() {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [scientific, setScientific] = useState(true);
  const [degrees, setDegrees] = useState(true);
  const tap = (key: CalcKey) => setState((s) => press(s, key, degrees));

  // Live preview while typing; the big number turns solid after "=".
  const preview = state.result ?? (state.expr ? calculate(state.expr, { degrees, ans: state.ans }) : null);

  return (
    <Screen padded={false}>
      <Header title="Calculator" right={<ModeSwitch scientific={scientific} onChange={setScientific} />} />
      <View className="flex-1 gap-3 px-4 pb-4">
        <View className="flex-1 justify-end gap-2 rounded-lg bg-ink/5 p-4">
          {state.history && (
            <Text variant="mono" tone="muted" className="text-right" numberOfLines={1}>
              {state.history}
            </Text>
          )}
          <Text variant="h2" tone="muted" className="text-right font-mono" numberOfLines={2}>
            {state.expr || ' '}
          </Text>
          {state.error ? (
            <Text variant="h2" tone="danger" className="text-right" accessibilityLiveRegion="polite">
              Can’t calculate that
            </Text>
          ) : (
            <Text
              variant="display"
              tone={state.result ? 'ink' : 'muted'}
              className="text-right"
              numberOfLines={1}
              adjustsFontSizeToFit
              accessibilityLiveRegion="polite">
              {preview ?? '0'}
            </Text>
          )}
          <View className="flex-row items-center justify-between pt-1">
            <Pressable
              onPress={() => setDegrees(!degrees)}
              accessibilityRole="button"
              accessibilityLabel={degrees ? 'Angles in degrees. Switch to radians' : 'Angles in radians. Switch to degrees'}
              hitSlop={8}
              className="min-h-7 justify-center rounded-full bg-default/10 px-2 active:bg-default/20">
              <Text variant="caption" tone="default" className="font-semibold">
                {degrees ? 'DEG' : 'RAD'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => user && askNow(user.uid, 'math', explainQuestion(state.expr, preview, degrees))}
              disabled={!state.expr.trim()}
              accessibilityRole="button"
              accessibilityLabel="Explain step by step"
              accessibilityHint="Asks Lucid to explain this calculation"
              className={`min-h-11 flex-row items-center gap-2 rounded-full bg-primary/10 px-3 active:bg-primary/20 ${state.expr.trim() ? '' : 'opacity-40'}`}>
              <Icon name="MessageCircle" size={16} tone="primary" />
              <Text variant="small" tone="primary" className="font-semibold">
                Explain step by step
              </Text>
            </Pressable>
          </View>
        </View>

        {scientific && <KeyGrid keys={SCIENTIFIC} columns={5} onPress={tap} label="Scientific keys" />}
        <KeyGrid keys={NUMBERS} columns={4} onPress={tap} label="Number keys" />
      </View>
    </Screen>
  );
}

function KeyGrid({ keys, columns, onPress, label }: { keys: KeyDef[]; columns: number; onPress: (key: CalcKey) => void; label: string }) {
  return (
    <View className="gap-2" accessibilityLabel={label}>
      {rows(keys, columns).map((row) => (
        <View key={row[0].a11y} className="flex-row gap-2">
          {row.map((d) => (
            <Pressable
              key={d.a11y}
              onPress={() => onPress(d.key)}
              accessibilityRole="button"
              accessibilityLabel={d.a11y}
              className={`flex-1 items-center justify-center rounded-md ${KEY_STYLE[d.kind].box}`}>
              <Text variant={KEY_STYLE[d.kind].variant} tone={KEY_STYLE[d.kind].tone}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function ModeSwitch({ scientific, onChange }: { scientific: boolean; onChange: (scientific: boolean) => void }) {
  return (
    <View className="flex-row rounded-full bg-ink/5 p-1" accessibilityRole="radiogroup" accessibilityLabel="Mode">
      {[false, true].map((sci) => {
        const on = sci === scientific;
        return (
          <Pressable
            key={String(sci)}
            onPress={() => onChange(sci)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={sci ? 'Scientific' : 'Basic'}
            hitSlop={6}
            className={`min-h-8 justify-center rounded-full px-3 ${on ? 'bg-primary' : 'active:bg-ink/10'}`}>
            <Text variant="small" tone={on ? 'paper' : 'muted'} className={on ? 'font-semibold' : 'font-medium'}>
              {sci ? 'Scientific' : 'Basic'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
