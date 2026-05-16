import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

type ListRowProps = Omit<PressableProps, 'children'> & {
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  icon?: LucideIcon;
  iconTint?: string;
  iconBg?: string;
  leading?: React.ReactNode;
  destructive?: boolean;
  loading?: boolean;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  selected?: boolean;
};

/**
 * iOS-style list row. Use inside a `<ListGroup>`.
 */
function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconTint,
  iconBg,
  leading,
  destructive,
  loading,
  showChevron,
  trailing,
  selected,
  onPress,
  disabled,
  className,
  ...rest
}: ListRowProps) {
  const isInteractive = !!onPress && !disabled;
  const showChevronComputed = showChevron ?? isInteractive;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'min-h-[52px] flex-row items-center gap-3 px-4 py-3',
        isInteractive && 'active:bg-surface-muted',
        disabled && 'opacity-50',
        className
      )}
      {...rest}>
      {leading}

      {!leading && icon ? (
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-lg',
            !iconBg && 'bg-primary/10'
          )}
          style={
            iconBg
              ? { backgroundColor: iconBg, borderCurve: 'continuous' }
              : { borderCurve: 'continuous' }
          }>
          <Icon
            as={icon}
            size={18}
            className={cn(!iconTint && (destructive ? 'text-destructive' : 'text-primary'))}
            color={iconTint}
          />
        </View>
      ) : null}

      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            'text-[16px] font-medium leading-5',
            destructive ? 'text-destructive' : 'text-foreground'
          )}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-muted-foreground" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing}

      {value !== undefined ? (
        typeof value === 'string' ? (
          <Text className="text-[15px] text-muted-foreground" numberOfLines={1}>
            {value}
          </Text>
        ) : (
          value
        )
      ) : null}

      {loading ? <ActivityIndicator size="small" /> : null}

      {selected ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}

      {showChevronComputed && !loading ? (
        <Icon as={ChevronRightIcon} size={16} className="text-muted-foreground" />
      ) : null}
    </Pressable>
  );
}

export { ListRow };
