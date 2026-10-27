import { useUnstableNativeVariable } from 'nativewind';
import { Platform } from 'react-native';

export type ColorToken = 'primary' | 'ink' | 'paper' | 'default' | 'success' | 'warning' | 'danger';

// TS resolves NativeWind's web typings (no-arg, never); the native build takes the variable name.
const useNativeVariable = useUnstableNativeVariable as unknown as (name: string) => string;

/** Token color as a value, for native props that can't take className (tintColor, placeholderTextColor). */
// shortcut: relies on NativeWind v5's unstable variable hook, swap if the API is renamed on upgrade.
export function useColor(token: ColorToken): string {
  // Platform.OS never changes at runtime, so the hook call order is stable.
  if (Platform.OS === 'web') return `var(--color-${token})`;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNativeVariable(`--color-${token}`);
}
