import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type Props = {
  /** Loudness 0–1 of the latest chunks, oldest first; fills bars from the left. */
  levels: number[];
  /** How many bars (v2.md: 28). */
  bars?: number;
};

const MIN_PX = 6;
const MAX_PX = 48;
// A gentle fixed shape for Reduce Motion: the bars don't jump with the voice.
const STILL = [0.3, 0.5, 0.8, 0.5, 0.3];

/** Mic level bars: spoken bars `bg-primary`, the rest `bg-ink/20`. Decorative; the sheet says "Listening". */
export function Waveform({ levels, bars = 28 }: Props) {
  const still = useReducedMotion();
  return (
    <View
      className="h-12 flex-row items-center justify-center gap-1"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: bars }, (_, i) => {
        const spoken = i < levels.length;
        const value = still ? STILL[i % STILL.length] : spoken ? levels[i] : 0;
        return (
          <View
            key={i}
            // Height follows the voice; it's a measurement, not a spacing step.
            style={{ height: MIN_PX + value * (MAX_PX - MIN_PX) }}
            className={`w-1 rounded-full ${spoken ? 'bg-primary' : 'bg-ink/20'}`}
          />
        );
      })}
    </View>
  );
}
