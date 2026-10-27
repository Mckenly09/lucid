import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// One bounce up and back per dot; the stagger makes the wave.
const HALF = 300;
const STAGGER = 150;
const EASE = Easing.inOut(Easing.quad);

/** Messenger-style "typing" dots while Lucid thinks (model loading or before the first word). */
export function TypingDots() {
  return (
    <View
      accessible
      accessibilityLabel="Lucid is thinking"
      accessibilityLiveRegion="polite"
      className="h-5 flex-row items-center gap-1">
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} />
      ))}
    </View>
  );
}

function Dot({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(
      index * STAGGER,
      withRepeat(withSequence(withTiming(1, { duration: HALF, easing: EASE }), withTiming(0, { duration: HALF, easing: EASE })), -1),
    );
    return () => cancelAnimation(t);
  }, [index, reduceMotion, t]);

  // Transform and opacity only, so the bubble's layout never moves. Under Reduce Motion the dots sit still at full strength.
  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : 0.4 + t.value * 0.6,
    transform: [{ translateY: -4 * t.value }],
  }));

  return <Animated.View className="h-2 w-2 rounded-full bg-ink/60" style={style} />;
}
