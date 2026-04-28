import { AuthField, AuthLink, AuthShell } from '@/components/ui/auth-shell';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

const MIN_PASSWORD_LENGTH = 8;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    if (!params.token) return '';
    return Array.isArray(params.token) ? params.token[0] || '' : params.token;
  }, [params.token]);

  const validationError = useMemo(() => {
    if (!token) return 'Reset token is missing or invalid. Request a new reset link.';
    if (!password || !confirmPassword) return '';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password, token]);

  const canSubmit = !!token && !!password && !!confirmPassword && !validationError && !isSubmitting;

  const handleReset = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({ token, newPassword: password });
      if (error) {
        setErrorMessage(error.message || 'Could not reset your password.');
        return;
      }
      setSuccessMessage('Your password was reset. Please sign in.');
      setTimeout(() => router.replace('/(auth)/sign-in'), 800);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not reset your password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password to secure your account."
      footer={
        <AuthLink
          prompt="Back to"
          cta="Sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      }
    >
      <AuthField
        label="New password"
        placeholder="At least 8 characters"
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <AuthField
        label="Confirm password"
        placeholder="Re-enter your new password"
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {validationError ? <Banner tone="destructive" message={validationError} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {successMessage ? <Banner tone="success" message={successMessage} /> : null}

      <Button onPress={handleReset} disabled={!canSubmit} size="lg">
        {isSubmitting ? <ActivityIndicator size="small" color="white" /> : null}
        <Text>{isSubmitting ? 'Resetting…' : 'Reset password'}</Text>
      </Button>
    </AuthShell>
  );
}
