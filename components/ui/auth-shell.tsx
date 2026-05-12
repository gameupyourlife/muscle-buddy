import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react-native';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Shared visual shell for auth screens.
 *
 * - SafeAreaView + KeyboardAvoidingView
 * - Centered, capped width (max-w-md) for tablets / web
 * - Subtle radial accents using primary color tokens (light + dark friendly)
 * - Standard "Muscle Buddy" eyebrow + heading + subtitle
 */
export function AuthShell({
  eyebrow = 'Muscle Buddy',
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <View className="flex-1 bg-background">
      {/* Decorative tinted blobs — subtle in light, slightly stronger in dark */}
      <View
        pointerEvents="none"
        className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary/10"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary/5"
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mx-auto w-full max-w-md gap-6">
              <View className="gap-2">
                <View className="self-start rounded-full bg-primary/10 px-3 py-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-primary">
                    {eyebrow}
                  </Text>
                </View>
                <Text className="text-[28px] font-bold text-foreground">{title}</Text>
                <Text className="text-[15px] text-muted-foreground">{subtitle}</Text>
              </View>

              <View
                className={cn(
                  'rounded-3xl bg-card border border-separator p-5 gap-4',
                )}
                style={{ borderCurve: 'continuous' }}
              >
                {children}
              </View>

              {footer ? <View className="pt-2">{footer}</View> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Convenience: link row at bottom of an auth card. */
export function AuthLink({
  prompt,
  cta,
  onPress,
}: {
  prompt: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-1">
      <Text className="text-[14px] text-muted-foreground">{prompt}</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text className="text-[14px] font-semibold text-primary">{cta}</Text>
      </Pressable>
    </View>
  );
}

/** Reusable labelled input. */
export function AuthField({
  label,
  trailing,
  ...inputProps
}: React.ComponentProps<typeof Input> & {
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Label>{label}</Label>
        {trailing}
      </View>
      <Input {...inputProps} />
    </View>
  );
}

/**
 * Password input with built-in show/hide toggle.
 * Use anywhere a password is captured.
 */
export function PasswordField({
  label,
  trailing,
  showStrength = false,
  ...inputProps
}: Omit<React.ComponentProps<typeof Input>, 'secureTextEntry'> & {
  label: string;
  trailing?: React.ReactNode;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);
  const value = typeof inputProps.value === 'string' ? inputProps.value : '';
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Label>{label}</Label>
        {trailing}
      </View>
      <View className="relative">
        <Input
          {...inputProps}
          secureTextEntry={!visible}
          className={cn('pr-10', inputProps.className)}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-0 bottom-0 items-center justify-center px-1"
        >
          <Icon
            as={visible ? EyeOffIcon : EyeIcon}
            size={18}
            className="text-muted-foreground"
          />
        </Pressable>
      </View>
      {showStrength ? <PasswordStrength password={value} /> : null}
    </View>
  );
}

function scorePassword(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_TONES = [
  'bg-destructive',
  'bg-destructive',
  'bg-warning',
  'bg-primary',
  'bg-success',
];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  return (
    <View className="gap-1">
      <View className="flex-row gap-1">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={cn(
              'flex-1 h-1 rounded-full',
              i < score ? STRENGTH_TONES[score] : 'bg-surface-muted',
            )}
          />
        ))}
      </View>
      <Text className="text-[11px] text-muted-foreground">
        Password strength: {STRENGTH_LABELS[score]}
      </Text>
    </View>
  );
}

export { Banner, Button, Text };
