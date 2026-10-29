import { styled } from 'nativewind';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardAvoidingView as KCKeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

// react-native-css only wraps SafeAreaProvider; without styled() its SafeAreaView drops className on native.
export const SafeAreaView = styled(RNSafeAreaView, { className: 'style' });
export const KeyboardAvoidingView = styled(KCKeyboardAvoidingView, { className: 'style' });

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Tab screens leave the bottom edge to the tab bar. */
  edges?: Edge[];
  /** Pinned below the content (Composer, action buttons); rides up with the keyboard. */
  footer?: ReactNode;
};

export function Screen({ children, scroll, padded = true, edges = ['top', 'bottom'], footer }: Props) {
  const pad = padded ? 'px-4' : '';
  const { bottom } = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      className="flex-1"
      // Slides during the keyboard animation and pads once at the end; "padding" relaid the whole screen (chat list too) every frame.
      behavior="translate-with-padding"
      automaticOffset
      enabled={footer !== undefined}
      // The keyboard already covers the bottom inset; don't pad for it twice.
      keyboardVerticalOffset={edges.includes('bottom') ? -bottom : 0}>
      <SafeAreaView edges={edges} className="flex-1 bg-paper">
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName={`grow ${pad} pb-6`}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 ${pad}`}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
