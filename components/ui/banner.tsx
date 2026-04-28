import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from 'lucide-react-native';
import { View, type ViewProps } from 'react-native';

type BannerProps = ViewProps & {
  tone?: 'info' | 'success' | 'warning' | 'destructive';
  title?: string;
  message: string;
};

/**
 * Inline status banner — replacement for ad-hoc colored boxes used for feedback / errors.
 * Tone-aware coloring + icon. Theme-safe (light + dark).
 */
function Banner({ tone = 'info', title, message, className, ...rest }: BannerProps) {
  const toneStyles = {
    info: {
      container: 'bg-primary/10 border-primary/20',
      title: 'text-primary',
      icon: InfoIcon,
      iconClass: 'text-primary',
    },
    success: {
      container: 'bg-success/10 border-success/30',
      title: 'text-success',
      icon: CheckCircle2Icon,
      iconClass: 'text-success',
    },
    warning: {
      container: 'bg-warning/15 border-warning/30',
      title: 'text-warning',
      icon: AlertCircleIcon,
      iconClass: 'text-warning',
    },
    destructive: {
      container: 'bg-destructive/10 border-destructive/30',
      title: 'text-destructive',
      icon: AlertCircleIcon,
      iconClass: 'text-destructive',
    },
  }[tone];

  return (
    <View
      className={cn(
        'flex-row items-start gap-3 rounded-2xl border p-3',
        toneStyles.container,
        className,
      )}
      style={{ borderCurve: 'continuous' }}
      {...rest}
    >
      <Icon as={toneStyles.icon} size={18} className={toneStyles.iconClass} />
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text className={cn('text-[14px] font-semibold', toneStyles.title)} selectable>
            {title}
          </Text>
        ) : null}
        <Text className="text-[14px] leading-5 text-foreground" selectable>
          {message}
        </Text>
      </View>
    </View>
  );
}

export { Banner };
