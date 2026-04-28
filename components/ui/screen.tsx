import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    View,
    type ScrollViewProps,
    type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Production screen wrapper.
 *
 * - Uses `contentInsetAdjustmentBehavior="automatic"` so iOS large titles + tab bar handle insets.
 * - Provides consistent horizontal padding & vertical gap for content blocks.
 * - Built-in optional pull-to-refresh and keyboard avoidance.
 */
type ScreenProps = Omit<ScrollViewProps, 'refreshControl'> & {
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  paddingHorizontal?: number;
  gap?: number;
  bottomGap?: number;
  scroll?: boolean;
};

function Screen({
  children,
  refreshing,
  onRefresh,
  paddingHorizontal = 16,
  gap = 16,
  bottomGap = 32,
  scroll = true,
  contentContainerStyle,
  className,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {scroll ? (
        <ScrollView
          className={cn('flex-1 bg-background', className)}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingHorizontal,
              paddingBottom: bottomGap + insets.bottom,
              gap,
            },
            contentContainerStyle,
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
            ) : undefined
          }
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          className={cn('flex-1 bg-background', className)}
          style={{ paddingHorizontal, paddingBottom: bottomGap + insets.bottom, gap }}
        >
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return content;
}

/** iOS-style uppercase section header. */
function SectionHeader({
  title,
  description,
  action,
  className,
  ...rest
}: ViewProps & { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <View
      className={cn('flex-row items-end justify-between px-1 pt-2', className)}
      {...rest}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="text-[13px] text-muted-foreground">{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/** iOS grouped-list container. Inserts hairline separators between children. */
function ListGroup({
  children,
  className,
  ...rest
}: ViewProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      className={cn(
        'overflow-hidden rounded-2xl bg-card border border-separator',
        className,
      )}
      style={{ borderCurve: 'continuous' }}
      {...rest}
    >
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < items.length - 1 ? (
            <View className="border-hairline border-separator ml-4" />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Surface card with consistent padding, rounded corners, hairline border. */
function Card({
  children,
  className,
  padded = true,
  ...rest
}: ViewProps & { padded?: boolean }) {
  return (
    <View
      className={cn(
        'rounded-2xl bg-card border border-separator',
        padded && 'p-4 gap-3',
        className,
      )}
      style={{ borderCurve: 'continuous' }}
      {...rest}
    >
      {children}
    </View>
  );
}

/** Run an effect every time the screen comes into focus. Convenience wrapper. */
function useScreenFocus(callback: () => void) {
  useFocusEffect(
    React.useCallback(() => {
      callback();
    }, [callback]),
  );
}

export { Card as Surface, ListGroup, Screen, SectionHeader, useScreenFocus };
