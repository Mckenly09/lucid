import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Status } from '@/components/badge';
import { Text } from '@/components/text';

const styles = {
  default: 'bg-default/10 border-default/30',
  success: 'bg-success/10 border-success/30',
  warning: 'bg-warning/10 border-warning/30',
  danger: 'bg-danger/10 border-danger/30',
} as const;

type Props = {
  status?: Status;
  title?: string;
  message: string;
  icon?: ReactNode;
  className?: string;
};

export function Banner({ status = 'default', title, message, icon, className = '' }: Props) {
  return (
    <View
      accessibilityRole={status === 'danger' ? 'alert' : undefined}
      className={`flex-row items-center gap-3 rounded-md border p-3 ${styles[status]} ${className}`}>
      {icon}
      <View className="flex-1">
        {title && (
          <Text variant="small" tone={status} className="font-semibold">
            {title}
          </Text>
        )}
        <Text variant={title ? 'caption' : 'small'} tone={title ? 'muted' : 'ink'} className="font-sans">
          {message}
        </Text>
      </View>
    </View>
  );
}
