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

export default function SignInScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGooglePending, setIsGooglePending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const trimmedEmail = email.trim().toLowerCase();

    const validationError = useMemo(() => {
        if (!trimmedEmail || !password) {
            return "";
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            return "Please enter a valid email address.";
        }

        if (password.length < 8) {
            return "Password must be at least 8 characters.";
        }

        return "";
    }, [trimmedEmail, password]);

    const canSubmit =
        trimmedEmail.length > 0 && password.length > 0 && !validationError && !isSubmitting;

    const handleSignIn = async () => {
        if (!canSubmit) {
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            const { error } = await authClient.signIn.email({
                email: trimmedEmail,
                password,
            });

            if (error) {
                setErrorMessage(error.message || "Unable to sign in right now.");
                return;
            }

            router.replace("/");
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Unable to sign in right now."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setErrorMessage(null);
        setIsGooglePending(true);

        try {
            const { error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: Linking.createURL("/"),
            });

            if (error) {
                setErrorMessage(error.message || "Google sign in is unavailable right now.");
            }
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Google sign in is unavailable right now."));
        } finally {
            setIsGooglePending(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
            <View className="absolute -top-20 left-[-15%] h-72 w-72 rounded-full bg-primary/10" />
            <View className="absolute bottom-[-80] right-[-20%] h-80 w-80 rounded-full bg-chart-2/20" />

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
                                    Welcome back
                                </Text>
                                <Text className="text-sm text-muted-foreground">
                                    Sign in to continue your training journey.
                                </Text>
                            </View>

                            <Card className="border-border/70 bg-card/95">
                                <CardHeader className="gap-1">
                                    <CardTitle>Sign in</CardTitle>
                                    <CardDescription>Use your email and password to access your account.</CardDescription>
                                </CardHeader>
                                <CardContent className="gap-4">
                                    <View className="gap-2">
                                        <Label nativeID="sign-in-email">Email</Label>
                                        <Input
                                            aria-labelledby="sign-in-email"
                                            placeholder="you@example.com"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            keyboardType="email-address"
                                            textContentType="emailAddress"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>

                                    <View className="gap-2">
                                        <View className="flex-row items-center justify-between">
                                            <Label nativeID="sign-in-password">Password</Label>
                                            <Pressable onPress={() => router.push("../forgot-password")}>
                                                <Text className="text-xs font-medium text-primary">Forgot password?</Text>
                                            </Pressable>
                                        </View>
                                        <View className="gap-2">
                                            <Input
                                                aria-labelledby="sign-in-password"
                                                placeholder="Enter your password"
                                                autoCapitalize="none"
                                                autoComplete="password"
                                                secureTextEntry={!showPassword}
                                                textContentType="password"
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

                                    <Button
                                        className="h-11"
                                        onPress={handleSignIn}
                                        disabled={!canSubmit}
                                    >
                                        {isSubmitting && <ActivityIndicator color="white" size="small" />}
                                        <Text>{isSubmitting ? "Signing in..." : "Sign in"}</Text>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-11"
                                        onPress={handleGoogleSignIn}
                                        disabled={isGooglePending}
                                    >
                                        {isGooglePending && <ActivityIndicator size="small" />}
                                        <Text>{isGooglePending ? "Opening Google..." : "Continue with Google"}</Text>
                                    </Button>
                                </CardContent>
                            </Card>

                            <View className="flex-row items-center justify-center gap-1">
                                <Text className="text-sm text-muted-foreground">New here?</Text>
                                <Pressable onPress={() => router.push("/(auth)/sign-up") }>
                                    <Text className="text-sm font-semibold text-primary">Create an account</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}