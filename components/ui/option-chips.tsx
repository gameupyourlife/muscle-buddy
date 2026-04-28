import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Pressable, ScrollView, View } from 'react-native';

export type OptionChip = {
  value: string;
  label: string;
  disabled?: boolean;
};

type OptionChipsProps = {
  items: OptionChip[];
  value?: string;
  onValueChange: (value: string) => void;
  layout?: 'wrap' | 'scroll';
  size?: 'default' | 'sm';
  className?: string;
};

function OptionChipButton({
  option,
  selected,
  onPress,
  size,
}: {
  option: OptionChip;
  selected: boolean;
  onPress: () => void;
  size: 'default' | 'sm';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={option.disabled}
      className={cn(
        'rounded-xl border px-3 py-2 active:opacity-80 flex-1 flex items-center justify-center',
        size === 'sm' ? 'min-h-9' : 'min-h-11',
        selected
          ? 'border-primary bg-primary/15'
          : 'border-border/70 bg-card/70',
        option.disabled && 'opacity-40'
      )}
    >
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

export function OptionChips({
  items,
  value,
  onValueChange,
  layout = 'wrap',
  size = 'default',
  className,
}: OptionChipsProps) {
  if (layout === 'scroll') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        className={cn('max-h-14', className)}
      >
        {items.map((option) => (
          <OptionChipButton
            key={option.value}
            option={option}
            size={size}
            selected={value === option.value}
            onPress={() => onValueChange(option.value)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {items.map((option) => (
        <OptionChipButton
          key={option.value}
          option={option}
          size={size}
          selected={value === option.value}
          onPress={() => onValueChange(option.value)}
        />
      ))}
    </View>
  );
}
