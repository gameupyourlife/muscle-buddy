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

export default function SignUpScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const validationError = useMemo(() => {
        if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
            return "";
        }

        if (trimmedName.length < 2) {
            return "Please enter your full name.";
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            return "Please enter a valid email address.";
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        }

        if (password !== confirmPassword) {
            return "Passwords do not match.";
        }

        return "";
    }, [confirmPassword, password, trimmedEmail, trimmedName]);

    const canSubmit =
        Boolean(trimmedName) &&
        Boolean(trimmedEmail) &&
        Boolean(password) &&
        Boolean(confirmPassword) &&
        !validationError &&
        !isSubmitting;

    const handleSignUp = async () => {
        if (!canSubmit) {
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            const { error } = await authClient.signUp.email({
                name: trimmedName,
                email: trimmedEmail,
                password,
                callbackURL: Linking.createURL("/"),
            });

            if (error) {
                setErrorMessage(error.message || "Could not create your account right now.");
                return;
            }

            setSuccessMessage("Account created. You can now sign in.");
            router.replace("/(auth)/sign-in");
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Could not create your account right now."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
            <View className="absolute -top-20 right-[-15%] h-72 w-72 rounded-full bg-chart-4/15" />
            <View className="absolute bottom-[-90] left-[-20%] h-80 w-80 rounded-full bg-primary/10" />

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
                                    Create your account
                                </Text>
                                <Text className="text-sm text-muted-foreground">
                                    Build consistency, track progress, and train smarter.
                                </Text>
                            </View>

                            <Card className="border-border/70 bg-card/95">
                                <CardHeader className="gap-1">
                                    <CardTitle>Sign up</CardTitle>
                                    <CardDescription>Join with your name, email, and a secure password.</CardDescription>
                                </CardHeader>
                                <CardContent className="gap-4">
                                    <View className="gap-2">
                                        <Label nativeID="sign-up-name">Full name</Label>
                                        <Input
                                            aria-labelledby="sign-up-name"
                                            placeholder="Jane Doe"
                                            autoCapitalize="words"
                                            autoComplete="name"
                                            textContentType="name"
                                            value={name}
                                            onChangeText={setName}
                                        />
                                    </View>

                                    <View className="gap-2">
                                        <Label nativeID="sign-up-email">Email</Label>
                                        <Input
                                            aria-labelledby="sign-up-email"
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
                                        <Label nativeID="sign-up-password">Password</Label>
                                        <Input
                                            aria-labelledby="sign-up-password"
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
                                        <Label nativeID="sign-up-confirm-password">Confirm password</Label>
                                        <Input
                                            aria-labelledby="sign-up-confirm-password"
                                            placeholder="Re-enter your password"
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

                                    <Button
                                        className="h-11"
                                        onPress={handleSignUp}
                                        disabled={!canSubmit}
                                    >
                                        {isSubmitting && <ActivityIndicator color="white" size="small" />}
                                        <Text>{isSubmitting ? "Creating account..." : "Create account"}</Text>
                                    </Button>
                                </CardContent>
                            </Card>

                            <View className="flex-row items-center justify-center gap-1">
                                <Text className="text-sm text-muted-foreground">Already have an account?</Text>
                                <Pressable onPress={() => router.replace("/(auth)/sign-in") }>
                                    <Text className="text-sm font-semibold text-primary">Sign in</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}