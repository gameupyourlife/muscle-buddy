import { AuthField, AuthLink, AuthShell, PasswordField } from '@/components/ui/auth-shell';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  const validationError = useMemo(() => {
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) return '';
    if (trimmedName.length < 2) return 'Please enter your full name.';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Please enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password, trimmedEmail, trimmedName]);

  const canSubmit =
    !!trimmedName &&
    !!trimmedEmail &&
    !!password &&
    !!confirmPassword &&
    !validationError &&
    !isSubmitting;

  const handleSignUp = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await authClient.signUp.email({
        name: trimmedName,
        email: trimmedEmail,
        password,
        callbackURL: Linking.createURL('/'),
      });
      if (error) {
        setErrorMessage(error.message || 'Could not create your account right now.');
        return;
      }
      setSuccessMessage('Account created. You can now sign in.');
      router.replace('/(auth)/sign-in');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not create your account right now.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Build consistency, track progress, and train smarter."
      footer={
        <AuthLink
          prompt="Already have an account?"
          cta="Sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      }
    >
      <AuthField
        label="Full name"
        placeholder="Jane Doe"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        value={name}
        onChangeText={setName}
      />
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
      <PasswordField
        label="Password"
        placeholder="At least 8 characters"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        showStrength
      />
      <PasswordField
        label="Confirm password"
        placeholder="Re-enter your password"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (canSubmit) void handleSignUp();
        }}
      />

      {validationError ? <Banner tone="destructive" message={validationError} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {successMessage ? <Banner tone="success" message={successMessage} /> : null}

      <Button onPress={handleSignUp} disabled={!canSubmit} size="lg">
        {isSubmitting ? <ActivityIndicator size="small" color="white" /> : null}
        <Text>{isSubmitting ? 'Creating account…' : 'Create account'}</Text>
      </Button>
    </AuthShell>
  );
}
