import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

type Feedback =
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null;

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

function formatDate(value: unknown) {
    if (!value) {
        return "Unknown";
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
    if (name) {
        const parts = name
            .split(" ")
            .map((part) => part.trim())
            .filter(Boolean)
            .slice(0, 2);

        if (parts.length > 0) {
            return parts.map((part) => part[0]?.toUpperCase()).join("");
        }
    }

    return (email?.slice(0, 2) || "MB").toUpperCase();
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
    if (!feedback) {
        return null;
    }

    return (
        <View
            className={
                feedback.type === "success"
                    ? "rounded-md border border-primary/30 bg-primary/10 p-3"
                    : "rounded-md border border-destructive/30 bg-destructive/10 p-3"
            }
        >
            <Text
                selectable
                className={feedback.type === "success" ? "text-sm text-primary" : "text-sm text-destructive"}
            >
                {feedback.message}
            </Text>
        </View>
    );
}

export default function AccountScreen() {
    const { data: session, isPending } = authClient.useSession();
    const user = session?.user;

    const [name, setName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
    const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
    const [sessionFeedback, setSessionFeedback] = useState<Feedback>(null);

    useEffect(() => {
        if (user?.name && !name) {
            setName(user.name);
        }
    }, [name, user?.name]);

    const joinedOn = useMemo(() => formatDate(user?.createdAt), [user?.createdAt]);
    const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.email, user?.name]);

    const trimmedName = name.trim();
    const trimmedNewEmail = newEmail.trim().toLowerCase();

    const canUpdateProfile =
        !!user &&
        trimmedName.length >= 2 &&
        trimmedName !== (user.name || "") &&
        !isUpdatingProfile;

    const canChangeEmail =
        !!user &&
        !!trimmedNewEmail &&
        EMAIL_REGEX.test(trimmedNewEmail) &&
        trimmedNewEmail !== user.email.toLowerCase() &&
        !isChangingEmail;

    const passwordValidationError = useMemo(() => {
        if (!currentPassword && !newPassword && !confirmPassword) {
            return "";
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return "Please fill all password fields.";
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        }

        if (newPassword !== confirmPassword) {
            return "New password and confirmation do not match.";
        }

        if (newPassword === currentPassword) {
            return "New password must be different from your current password.";
        }

        return "";
    }, [confirmPassword, currentPassword, newPassword]);

    const canChangePassword =
        !!currentPassword &&
        !!newPassword &&
        !!confirmPassword &&
        !passwordValidationError &&
        !isChangingPassword;

    const handleUpdateProfile = async () => {
        if (!canUpdateProfile) {
            return;
        }

        setProfileFeedback(null);
        setIsUpdatingProfile(true);

        try {
            const { error } = await authClient.updateUser({
                name: trimmedName,
            });

            if (error) {
                setProfileFeedback({
                    type: "error",
                    message: error.message || "Could not update your profile.",
                });
                return;
            }

            setProfileFeedback({
                type: "success",
                message: "Profile updated successfully.",
            });
        } catch (error) {
            setProfileFeedback({
                type: "error",
                message: getErrorMessage(error, "Could not update your profile."),
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!canChangeEmail) {
            return;
        }

        setEmailFeedback(null);
        setIsChangingEmail(true);

        try {
            const { error } = await authClient.changeEmail({
                newEmail: trimmedNewEmail,
                callbackURL: Linking.createURL("/"),
            });

            if (error) {
                setEmailFeedback({
                    type: "error",
                    message: error.message || "Could not start email change.",
                });
                return;
            }

            setEmailFeedback({
                type: "success",
                message: "Check your current inbox to confirm this email change.",
            });
            setNewEmail("");
        } catch (error) {
            setEmailFeedback({
                type: "error",
                message: getErrorMessage(error, "Could not start email change."),
            });
        } finally {
            setIsChangingEmail(false);
        }
    };

    const handleChangePassword = async () => {
        if (!canChangePassword) {
            return;
        }

        setPasswordFeedback(null);
        setIsChangingPassword(true);

        try {
            const { error } = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                setPasswordFeedback({
                    type: "error",
                    message: error.message || "Could not change your password.",
                });
                return;
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordFeedback({
                type: "success",
                message: "Password changed successfully. Other sessions were signed out.",
            });
        } catch (error) {
            setPasswordFeedback({
                type: "error",
                message: getErrorMessage(error, "Could not change your password."),
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleRevokeOtherSessions = async () => {
        setSessionFeedback(null);
        setIsRevokingOtherSessions(true);

        try {
            const { error } = await authClient.revokeOtherSessions();

            if (error) {
                setSessionFeedback({
                    type: "error",
                    message: error.message || "Could not revoke other sessions.",
                });
                return;
            }

            setSessionFeedback({
                type: "success",
                message: "All other active sessions were revoked.",
            });
        } catch (error) {
            setSessionFeedback({
                type: "error",
                message: getErrorMessage(error, "Could not revoke other sessions."),
            });
        } finally {
            setIsRevokingOtherSessions(false);
        }
    };

    const handleSignOut = async () => {
        setSessionFeedback(null);
        setIsSigningOut(true);

        try {
            const { error } = await authClient.signOut();

            if (error) {
                setSessionFeedback({
                    type: "error",
                    message: error.message || "Could not sign out right now.",
                });
                return;
            }

            router.replace("/(auth)/sign-in");
        } catch (error) {
            setSessionFeedback({
                type: "error",
                message: getErrorMessage(error, "Could not sign out right now."),
            });
        } finally {
            setIsSigningOut(false);
        }
    };

    if (isPending) {
        return (
            <>
                <Stack.Screen options={{ title: "Account" }} />
                <View className="flex-1 items-center justify-center bg-background">
                    <ActivityIndicator size="small" />
                    <Text className="mt-3 text-sm text-muted-foreground">Loading your account...</Text>
                </View>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <Stack.Screen options={{ title: "Account" }} />
                <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
                    <Text className="text-center text-muted-foreground">
                        No active user session found.
                    </Text>
                    <Button onPress={() => router.replace("/(auth)/sign-in") }>
                        <Text>Go to sign in</Text>
                    </Button>
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: "Account" }} />

            <ScrollView
                className="flex-1 bg-black"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text className="text-[#8e8e93] text-[13px] uppercase font-semibold ml-4 mb-2 mt-6">Profile</Text>
                <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
                    <View className="flex-row items-center p-4 border-b border-[#38383a]">
                        <Avatar className="size-14 border border-[#38383a] mr-4" alt={user.name || user.email}>
                            <AvatarImage source={{ uri: user.image || undefined }} />
                            <AvatarFallback>
                                <Text className="text-sm font-semibold">{initials}</Text>
                            </AvatarFallback>
                        </Avatar>

                        <View className="flex-1 justify-center gap-1">
                            <Text className="text-white text-[17px] font-semibold">{user.name}</Text>
                            <Text selectable className="text-[#8e8e93] text-[13px]">
                                {user.email}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-[#8e8e93] text-[13px] mr-2">
                                    {user.emailVerified ? "Verified" : "Not verified"}
                                </Text>
                                <Text className="text-[#8e8e93] text-[13px]">• Joined {joinedOn}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4">Display Name</Text>
                        <Input
                            aria-labelledby="account-name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Your full name"
                            autoCapitalize="words"
                            autoComplete="name"
                            className="flex-1 text-right border-0 bg-transparent text-white"
                        />
                    </View>
                    
                    {profileFeedback && (
                        <View className="p-4 border-b border-[#38383a]">
                            <Text className={profileFeedback.type === "success" ? "text-green-500" : "text-red-500"}>
                                {profileFeedback.message}
                            </Text>
                        </View>
                    )}

                    <Button 
                        variant="ghost" 
                        onPress={handleUpdateProfile} 
                        disabled={!canUpdateProfile} 
                        className="flex-row justify-center p-4 h-auto rounded-none border-0"
                    >
                        {isUpdatingProfile && <ActivityIndicator color="white" size="small" className="mr-2" />}
                        <Text className="text-white text-[17px]">{isUpdatingProfile ? "Saving..." : "Save profile"}</Text>
                    </Button>
                </View>

                <Text className="text-[#8e8e93] text-[13px] uppercase font-semibold ml-4 mb-2 mt-6">Change Email</Text>
                <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px]">Current Email</Text>
                        <Text className="text-[#8e8e93] text-[17px]">{user.email}</Text>
                    </View>

                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4">New Email</Text>
                        <Input
                            aria-labelledby="account-new-email"
                            value={newEmail}
                            onChangeText={setNewEmail}
                            placeholder="new-email@example.com"
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            className="flex-1 text-right border-0 bg-transparent text-white"
                        />
                    </View>

                    {emailFeedback && (
                        <View className="p-4 border-b border-[#38383a]">
                            <Text className={emailFeedback.type === "success" ? "text-green-500" : "text-red-500"}>
                                {emailFeedback.message}
                            </Text>
                        </View>
                    )}

                    <Button 
                        variant="ghost" 
                        onPress={handleChangeEmail} 
                        disabled={!canChangeEmail} 
                        className="flex-row justify-center p-4 h-auto rounded-none border-0"
                    >
                        {isChangingEmail && <ActivityIndicator color="white" size="small" className="mr-2" />}
                        <Text className="text-white text-[17px]">{isChangingEmail ? "Submitting..." : "Request email change"}</Text>
                    </Button>
                </View>

                <Text className="text-[#8e8e93] text-[13px] uppercase font-semibold ml-4 mb-2 mt-6">Change Password</Text>
                <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4 w-1/3">Current Password</Text>
                        <Input
                            aria-labelledby="account-current-password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password"
                            textContentType="password"
                            placeholder="Current password"
                            className="flex-1 text-right border-0 bg-transparent text-white"
                        />
                    </View>

                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4 w-1/3">New Password</Text>
                        <Input
                            aria-labelledby="account-new-password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="newPassword"
                            placeholder="Min 8 chars"
                            className="flex-1 text-right border-0 bg-transparent text-white"
                        />
                    </View>

                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4 w-1/3">Confirm Password</Text>
                        <Input
                            aria-labelledby="account-confirm-password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="newPassword"
                            placeholder="Re-enter password"
                            className="flex-1 text-right border-0 bg-transparent text-white"
                        />
                    </View>

                    {!!passwordValidationError && (
                        <View className="p-4 border-b border-[#38383a]">
                            <Text className="text-red-500 text-[15px]">{passwordValidationError}</Text>
                        </View>
                    )}
                    
                    {passwordFeedback && (
                        <View className="p-4 border-b border-[#38383a]">
                            <Text className={passwordFeedback.type === "success" ? "text-green-500" : "text-red-500"}>
                                {passwordFeedback.message}
                            </Text>
                        </View>
                    )}

                    <Button 
                        variant="ghost" 
                        onPress={handleChangePassword} 
                        disabled={!canChangePassword} 
                        className="flex-row justify-center p-4 h-auto rounded-none border-0"
                    >
                        {isChangingPassword && <ActivityIndicator color="white" size="small" className="mr-2" />}
                        <Text className="text-white text-[17px]">{isChangingPassword ? "Updating..." : "Change password"}</Text>
                    </Button>
                </View>

                <Text className="text-[#8e8e93] text-[13px] uppercase font-semibold ml-4 mb-2 mt-6">Sessions & Security</Text>
                <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
                    {sessionFeedback && (
                        <View className="p-4 border-b border-[#38383a]">
                            <Text className={sessionFeedback.type === "success" ? "text-green-500" : "text-red-500"}>
                                {sessionFeedback.message}
                            </Text>
                        </View>
                    )}

                    <Button
                        variant="ghost"
                        onPress={handleRevokeOtherSessions}
                        disabled={isRevokingOtherSessions}
                        className="flex-row justify-center p-4 h-auto rounded-none border-b border-[#38383a]"
                    >
                        {isRevokingOtherSessions && <ActivityIndicator size="small" className="mr-2" />}
                        <Text className="text-white text-[17px]">{isRevokingOtherSessions ? "Revoking..." : "Sign out other sessions"}</Text>
                    </Button>

                    <Button
                        variant="ghost"
                        onPress={handleSignOut}
                        disabled={isSigningOut}
                        className="flex-row justify-center p-4 h-auto rounded-none border-0"
                    >
                        {isSigningOut && <ActivityIndicator color="white" size="small" className="mr-2" />}
                        <Text className="text-red-500 text-[17px] font-semibold">{isSigningOut ? "Signing out..." : "Sign out"}</Text>
                    </Button>
                </View>
            </ScrollView>
        </>
    );
}