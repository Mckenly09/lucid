import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

/** Required on every answer screen (AGENTS.md: never remove). */
export function Disclaimer({ compact, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <View className={`flex-row items-center gap-2 ${compact ? 'justify-center' : ''} ${className}`}>
      {!compact && <Icon name="Info" size={16} tone="default" />}
      <Text variant="caption" tone="default" className="font-sans">
        {compact ? 'AI can be wrong — always check your textbook.' : 'AI can be wrong — check your textbook.'}
      </Text>
    </View>
  );
}
