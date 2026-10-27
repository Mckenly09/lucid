import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';

type Props = {
  title?: string;
  /** Muted, small title (onboarding "Step 1 of 2"). */
  subtle?: boolean;
  /** `close` for full-screen tasks like a quiz. */
  back?: 'back' | 'close';
  right?: ReactNode;
  bordered?: boolean;
};

export function Header({ title, subtle, back = 'back', right, bordered }: Props) {
  return (
    <View className={`min-h-14 flex-row items-center gap-1 px-1 ${bordered ? 'border-b border-ink/10' : ''}`}>
      <IconButton
        accessibilityLabel={back === 'close' ? 'Close' : 'Go back'}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        icon={
          back === 'close' ? (
            <Icon name="X" size={24} />
          ) : (
            <Icon name="ChevronLeft" size={22} />
          )
        }
      />
      {title && (
        <Text
          variant={subtle ? 'small' : 'h3'}
          tone={subtle ? 'muted' : 'ink'}
          accessibilityRole="header"
          numberOfLines={1}
          className="flex-1">
          {title}
        </Text>
      )}
      {right && <View className="ml-auto pr-2">{right}</View>}
    </View>
  );
}
