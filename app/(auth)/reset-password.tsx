import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MIN_PASSWORD_LENGTH = 8;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    if (!params.token) {
      return "";
    }

    return Array.isArray(params.token) ? params.token[0] || "" : params.token;
  }, [params.token]);

  const validationError = useMemo(() => {
    if (!token) {
      return "Reset token is missing or invalid. Request a new reset link.";
    }

    if (!password || !confirmPassword) {
      return "";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }, [confirmPassword, password, token]);

  const canSubmit =
    Boolean(token) &&
    Boolean(password) &&
    Boolean(confirmPassword) &&
    !validationError &&
    !isSubmitting;

  const handleResetPassword = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.resetPassword({
        token,
        newPassword: password,
      });

      if (error) {
        setErrorMessage(error.message || "Could not reset your password.");
        return;
      }

      setSuccessMessage("Your password was reset successfully. Please sign in.");
      setTimeout(() => {
        router.replace("/(auth)/sign-in");
      }, 800);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not reset your password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="absolute -top-16 right-[-12%] h-64 w-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-[-90] left-[-20%] h-80 w-80 rounded-full bg-chart-5/15" />

      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="mx-auto w-full max-w-md gap-5">
              <View className="gap-2">
                <Text className="text-sm uppercase tracking-[2px] text-primary">Muscle Buddy</Text>
                <Text variant="h3" className="text-foreground">
                  Set a new password
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Choose a strong password to secure your account.
                </Text>
              </View>

              <Card className="border-border/70 bg-card/95">
                <CardHeader className="gap-1">
                  <CardTitle>Reset password</CardTitle>
                  <CardDescription>Use the token from your reset email to continue.</CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  <View className="gap-2">
                    <Label nativeID="new-password">New password</Label>
                    <Input
                      aria-labelledby="new-password"
                      placeholder="At least 8 characters"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start px-0"
                      onPress={() => setShowPassword((value) => !value)}
                    >
                      <Text>{showPassword ? "Hide password" : "Show password"}</Text>
                    </Button>
                  </View>

                  <View className="gap-2">
                    <Label nativeID="confirm-new-password">Confirm password</Label>
                    <Input
                      aria-labelledby="confirm-new-password"
                      placeholder="Re-enter your new password"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      secureTextEntry={!showConfirmPassword}
                      textContentType="newPassword"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start px-0"
                      onPress={() => setShowConfirmPassword((value) => !value)}
                    >
                      <Text>{showConfirmPassword ? "Hide password" : "Show password"}</Text>
                    </Button>
                  </View>

                  {!!validationError && (
                    <View className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{validationError}</Text>
                    </View>
                  )}

                  {!!errorMessage && (
                    <View className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{errorMessage}</Text>
                    </View>
                  )}

                  {!!successMessage && (
                    <View className="rounded-md border border-primary/30 bg-primary/10 p-3">
                      <Text className="text-sm text-primary">{successMessage}</Text>
                    </View>
                  )}

                  <Button className="h-11" onPress={handleResetPassword} disabled={!canSubmit}>
                    {isSubmitting && <ActivityIndicator color="white" size="small" />}
                    <Text>{isSubmitting ? "Saving password..." : "Reset password"}</Text>
                  </Button>
                </CardContent>
              </Card>

              <View className="flex-row items-center justify-center gap-1">
                <Text className="text-sm text-muted-foreground">Need a new reset link?</Text>
                <Pressable onPress={() => router.replace("../forgot-password")}>
                  <Text className="text-sm font-semibold text-primary">Request one</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
