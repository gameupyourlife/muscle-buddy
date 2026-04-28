import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import { View, type ViewProps } from 'react-native';

type EmptyStateProps = ViewProps & {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

/**
 * Empty / zero-state placeholder. Use inside cards or sections where data may not yet exist.
 */
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        'items-center justify-center gap-3',
        compact ? 'py-6 px-4' : 'py-10 px-6',
        className,
      )}
      {...rest}
    >
      {icon ? (
        <View
          className="h-14 w-14 items-center justify-center rounded-full bg-surface-muted"
          style={{ borderCurve: 'continuous' }}
        >
          <Icon as={icon} size={26} className="text-muted-foreground" />
        </View>
      ) : null}
      <Text className="text-center text-[17px] font-semibold text-foreground" selectable>
        {title}
      </Text>
      {description ? (
        <Text
          className="text-center text-[14px] text-muted-foreground leading-5 max-w-[320px]"
          selectable
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction} variant="default" className="mt-1">
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export { EmptyState };
