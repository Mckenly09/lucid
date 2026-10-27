import { Text as RNText, type TextProps } from 'react-native';

const variants = {
  display: 'text-display font-bold',
  h1: 'text-h1 font-bold',
  h2: 'text-h2 font-semibold',
  h3: 'text-h3 font-semibold',
  body: 'text-body font-sans',
  small: 'text-small font-sans',
  caption: 'text-caption font-medium',
  label: 'text-caption font-semibold uppercase tracking-wide', // section labels: TRY ASKING, GIVEN…
  mono: 'text-small font-mono',
} as const;

const tones = {
  ink: 'text-ink',
  muted: 'text-ink/60',
  paper: 'text-paper',
  primary: 'text-primary',
  default: 'text-default',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

type Props = TextProps & { variant?: TextVariant; tone?: TextTone; className?: string };

export function Text({ variant = 'body', tone, className = '', ...rest }: Props) {
  const t = tone ?? (variant === 'label' ? 'muted' : 'ink');
  return <RNText className={`${variants[variant]} ${tones[t]} ${className}`} {...rest} />;
}
