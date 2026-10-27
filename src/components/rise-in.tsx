import type { ReactNode } from 'react';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Gap between siblings in a staggered entrance. */
export const STAGGER = 60;

type Props = {
  children: ReactNode;
  delay?: number;
  /** Fade only, for footers and banners that shouldn't move. */
  fade?: boolean;
  className?: string;
};

/**
 * First-run entrance: 12px rise + fade, ease-out. Mount-only, so it never replays on re-render.
 * Layout animations follow the system Reduce Motion setting and render in place when it's on.
 */
export function RiseIn({ children, delay = 0, fade, className }: Props) {
  const entering = fade
    ? FadeIn.duration(400).delay(delay).easing(EASE_OUT)
    : FadeInDown.duration(500)
        .delay(delay)
        .easing(EASE_OUT)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
  return (
    <Animated.View entering={entering} className={className}>
      {children}
    </Animated.View>
  );
}
