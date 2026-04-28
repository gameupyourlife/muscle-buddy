import { AuthField, AuthLink, AuthShell } from '@/components/ui/auth-shell';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const validationError = useMemo(() => {
    if (!trimmedEmail) return '';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Please enter a valid email address.';
    return '';
  }, [trimmedEmail]);

  const canSubmit = !!trimmedEmail && !validationError && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: trimmedEmail,
        redirectTo: Linking.createURL('/reset-password'),
      });
      if (error) {
        setErrorMessage(error.message || 'Unable to send reset instructions.');
        return;
      }
      setSuccessMessage(
        'If an account exists for this email, password reset instructions were sent.'
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to send reset instructions.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we will send reset instructions."
      footer={
        <AuthLink
          prompt="Remembered it?"
          cta="Back to sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      }
    >
      <AuthField
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      {validationError ? <Banner tone="destructive" message={validationError} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {successMessage ? <Banner tone="success" message={successMessage} /> : null}

      <Button onPress={handleSubmit} disabled={!canSubmit} size="lg">
        {isSubmitting ? <ActivityIndicator size="small" color="white" /> : null}
        <Text>{isSubmitting ? 'Sending link…' : 'Send reset link'}</Text>
      </Button>
    </AuthShell>
  );
}
