import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

type Props = { count: number; minutes: number; onReview: () => void };

/** Home: how many flashcards are due today, with a shortcut to review them. */
export function DueCardsCard({ count, minutes, onReview }: Props) {
  return (
    <Card variant="outlined" className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-md bg-ink/5">
        <Icon name="Copy" />
      </View>
      <View className="flex-1">
        <Text variant="h3">{count === 1 ? '1 card due' : `${count} cards due`}</Text>
        <Text variant="small" tone="muted">
          About {minutes} {minutes === 1 ? 'minute' : 'minutes'}
        </Text>
      </View>
      <Button label="Review" onPress={onReview} />
    </Card>
  );
}
