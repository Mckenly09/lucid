import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Tab screens leave the bottom edge to the tab bar. */
  edges?: Edge[];
  /** Pinned below the content (Composer, action buttons). */
  footer?: ReactNode;
};

export function Screen({ children, scroll, padded = true, edges = ['top', 'bottom'], footer }: Props) {
  const pad = padded ? 'px-4' : '';
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-paper">
      {scroll ? (
        <ScrollView className="flex-1" contentContainerClassName={`grow ${pad} pb-6`} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${pad}`}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}
