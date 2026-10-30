import { View } from 'react-native';

/** One bar per question, in order: right `bg-success`, wrong `bg-danger`. */
export function ScoreDots({ results }: { results: boolean[] }) {
  const right = results.filter(Boolean).length;
  return (
    <View accessible accessibilityLabel={`${right} of ${results.length} right`} className="flex-row gap-1">
      {results.map((ok, i) => (
        <View key={i} className={`h-2 flex-1 rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
      ))}
    </View>
  );
}
