import { AuthField, AuthLink, AuthShell, PasswordField } from '@/components/ui/auth-shell';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();

  const validationError = useMemo(() => {
    if (!trimmedEmail || !password) return '';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return '';
  }, [trimmedEmail, password]);

  const canSubmit =
    trimmedEmail.length > 0 && password.length > 0 && !validationError && !isSubmitting;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({ email: trimmedEmail, password });
      if (error) {
        setErrorMessage(error.message || 'Unable to sign in right now.');
        return;
      }
      router.replace('/');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to sign in right now.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGooglePending(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: Linking.createURL('/'),
      });
      if (error) {
        setErrorMessage(error.message || 'Google sign in is unavailable right now.');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Google sign in is unavailable right now.'));
    } finally {
      setIsGooglePending(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your training journey."
      footer={
        <AuthLink
          prompt="New to Muscle Buddy?"
          cta="Create an account"
          onPress={() => router.replace('/(auth)/sign-up')}
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
      <PasswordField
        label="Password"
        placeholder="Enter your password"
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (canSubmit) void handleSignIn();
        }}
        trailing={
          <Button
            variant="ghost"
            size="sm"
            className="px-0 h-auto py-0"
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text className="text-[12px] font-semibold text-primary">Forgot?</Text>
          </Button>
        }
      />

      {validationError ? <Banner tone="destructive" message={validationError} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}

      <Button onPress={handleSignIn} disabled={!canSubmit} size="lg">
        {isSubmitting ? <ActivityIndicator size="small" color="white" /> : null}
        <Text>{isSubmitting ? 'Signing in…' : 'Sign in'}</Text>
      </Button>

      <View className="flex-row items-center gap-3">
        <View className="flex-1 border-t-hairline border-separator" />
        <Text className="text-[12px] text-muted-foreground">or</Text>
        <View className="flex-1 border-t-hairline border-separator" />
      </View>

      <Button
        variant="outline"
        onPress={handleGoogleSignIn}
        disabled={isGooglePending}
        size="lg"
      >
        {isGooglePending ? <ActivityIndicator size="small" /> : null}
        <Text>{isGooglePending ? 'Connecting…' : 'Continue with Google'}</Text>
      </Button>
    </AuthShell>
  );
}
