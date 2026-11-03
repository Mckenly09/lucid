import { styled } from 'nativewind';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { type ComponentType, type ReactNode, useContext } from 'react';
import { View } from 'react-native';
import {
  KeyboardAvoidingView as KCKeyboardAvoidingView,
  KeyboardAwareScrollView as KCKeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

// react-native-css only wraps SafeAreaProvider; without styled() its SafeAreaView drops className on native.
export const SafeAreaView = styled(RNSafeAreaView, { className: 'style' });
export const KeyboardAvoidingView = styled(KCKeyboardAvoidingView, { className: 'style' });
// Typed by hand: letting TS infer styled()'s props for this component fails with TS2590 (union too complex).
type StyleProps = { style?: unknown; contentContainerStyle?: unknown };
const KeyboardAwareScrollView = styled(KCKeyboardAwareScrollView as ComponentType<StyleProps>, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
}) as unknown as ComponentType<KeyboardAwareScrollViewProps & { className?: string; contentContainerClassName?: string }>;

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
  // Only the footer follows the keyboard; translating the whole screen moved the header too.
  // The footer already sits above the tab bar (tab screens) or the bottom inset; the keyboard covers those.
  const below = (useContext(BottomTabBarHeightContext) ?? 0) + (edges.includes('bottom') ? bottom : 0);
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-paper">
      {scroll ? (
        // Only scroll the focused field above the keyboard, and pad for it so all content stays reachable; the screen stays put.
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName={`grow ${pad} pb-6`}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled">
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View className={`flex-1 ${pad}`}>{children}</View>
      )}
      {footer !== undefined && <KeyboardStickyView offset={{ opened: below }}>{footer}</KeyboardStickyView>}
    </SafeAreaView>
  );
}
