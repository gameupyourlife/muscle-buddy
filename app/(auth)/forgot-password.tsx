import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import * as Linking from "expo-linking";
import { router } from "expo-router";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();

  const validationError = useMemo(() => {
    if (!trimmedEmail) {
      return "";
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return "Please enter a valid email address.";
    }

    return "";
  }, [trimmedEmail]);

  const canSubmit = Boolean(trimmedEmail) && !validationError && !isSubmitting;

  const handleSendResetLink = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: trimmedEmail,
        redirectTo: Linking.createURL("/reset-password"),
      });

      if (error) {
        setErrorMessage(error.message || "Unable to send reset instructions.");
        return;
      }

      setSuccessMessage(
        "If an account exists for this email, password reset instructions were sent."
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to send reset instructions."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="absolute -top-16 left-[-12%] h-64 w-64 rounded-full bg-chart-3/15" />
      <View className="absolute bottom-[-90] right-[-20%] h-80 w-80 rounded-full bg-primary/10" />

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
                  Forgot password?
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Enter your email and we will send reset instructions.
                </Text>
              </View>

              <Card className="border-border/70 bg-card/95">
                <CardHeader className="gap-1">
                  <CardTitle>Reset your password</CardTitle>
                  <CardDescription>
                    Use the reset link from your email to create a new password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  <View className="gap-2">
                    <Label nativeID="forgot-email">Email</Label>
                    <Input
                      aria-labelledby="forgot-email"
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      value={email}
                      onChangeText={setEmail}
                    />
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

                  <Button className="h-11" onPress={handleSendResetLink} disabled={!canSubmit}>
                    {isSubmitting && <ActivityIndicator color="white" size="small" />}
                    <Text>{isSubmitting ? "Sending link..." : "Send reset link"}</Text>
                  </Button>
                </CardContent>
              </Card>

              <View className="flex-row items-center justify-center gap-1">
                <Text className="text-sm text-muted-foreground">Remembered your password?</Text>
                <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
                  <Text className="text-sm font-semibold text-primary">Back to sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
