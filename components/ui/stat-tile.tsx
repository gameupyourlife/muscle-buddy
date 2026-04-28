import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import { View, type ViewProps } from 'react-native';

type StatTileProps = ViewProps & {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
};

const toneText = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

/** Compact stat tile used on dashboards. */
function StatTile({
  label,
  value,
  unit,
  trend,
  icon,
  tone = 'default',
  className,
  ...rest
}: StatTileProps) {
  return (
    <View
      className={cn(
        'flex-1 gap-2 rounded-2xl bg-card border border-separator p-4',
        className,
      )}
      style={{ borderCurve: 'continuous' }}
      {...rest}
    >
      <View className="flex-row items-center gap-2">
        {icon ? <Icon as={icon} size={14} className="text-muted-foreground" /> : null}
        <Text className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text
          className={cn('text-[28px] font-bold leading-tight', toneText[tone])}
          style={{ fontVariant: ['tabular-nums'] }}
          selectable
        >
          {value}
        </Text>
        {unit ? (
          <Text className="text-[14px] font-medium text-muted-foreground">{unit}</Text>
        ) : null}
      </View>
      {trend ? (
        <Text className="text-[12px] text-muted-foreground">{trend}</Text>
      ) : null}
    </View>
  );
}

export { StatTile };
