import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

type SendStatus =
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
    | null;

type ConstantsWithManifest = typeof Constants & {
    manifest2?: {
        extra?: {
            expoClient?: {
                hostUri?: string;
            };
        };
    };
};



function trimTrailingSlash(value: string) {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
    const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (configuredBaseUrl) {
        return trimTrailingSlash(configuredBaseUrl);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        return trimTrailingSlash(window.location.origin);
    }

    const constants = Constants as ConstantsWithManifest;
    const expoConfigHost = (constants.expoConfig as { hostUri?: string } | null)?.hostUri;
    const hostUri = expoConfigHost ?? constants.manifest2?.extra?.expoClient?.hostUri;

    if (!hostUri) {
        return null;
    }

    const host = hostUri
        .replace(/^https?:\/\//, '')
        .replace(/^exp:\/\//, '')
        .split('/')[0];

    if (!host) {
        return null;
    }

    return `http://${host}`;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message;
        }
    }

    return fallback;
}

export default function DeveloperOptionsScreen() {
    const { data: session } = authClient.useSession();

    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Muscle Buddy test email');
    const [message, setMessage] = useState(
        'This is a test email sent from the Muscle Buddy developer options screen.'
    );
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<SendStatus>(null);

    const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
    const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/send-email` : null;

    useEffect(() => {
        const userEmail = session?.user?.email;
        if (!to && userEmail) {
            setTo(userEmail);
        }
    }, [session?.user?.email, to]);

    const canSend =
        !!endpoint &&
        to.trim().length > 0 &&
        subject.trim().length > 0 &&
        message.trim().length > 0 &&
        !isSending;

    const handleSendTestEmail = async () => {
        if (!canSend || !endpoint) {
            return;
        }

        setStatus(null);
        setIsSending(true);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: to.trim(),
                    subject: subject.trim(),
                    text: message.trim(),
                }),
            });

            const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;

            if (!response.ok) {
                throw new Error(body?.error || `Send email request failed with status ${response.status}`);
            }

            const sentMessageId = body?.id || 'unknown-id';
            setStatus({
                type: 'success',
                message: `Test email sent successfully. Message id: ${sentMessageId}`,
            });
        } catch (error) {
            setStatus({
                type: 'error',
                message: getErrorMessage(error, 'Unable to send test email right now.'),
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Developer Options' }} />
            <ScrollView
                className="flex-1 bg-background"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 }}
                keyboardShouldPersistTaps="handled"
            >
                <Card className="border-border/70 bg-card/95">
                    <CardHeader className="gap-2">
                        <CardTitle>Send test email</CardTitle>
                        <CardDescription>
                            Trigger the API route directly from the app to validate your Resend setup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="gap-4">
                        <View className="gap-2">
                            <Label nativeID="dev-email-to">To</Label>
                            <Input
                                aria-labelledby="dev-email-to"
                                value={to}
                                onChangeText={setTo}
                                placeholder="you@example.com"
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                textContentType="emailAddress"
                            />
                        </View>

                        <View className="gap-2">
                            <Label nativeID="dev-email-subject">Subject</Label>
                            <Input
                                aria-labelledby="dev-email-subject"
                                value={subject}
                                onChangeText={setSubject}
                                placeholder="Enter an email subject"
                            />
                        </View>

                        <View className="gap-2">
                            <Label nativeID="dev-email-message">Message</Label>
                            <Input
                                aria-labelledby="dev-email-message"
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Enter the email text body"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                className="min-h-[112px]"
                            />
                        </View>

                        <View className="rounded-md border border-border/60 bg-muted/40 p-3">
                            <Text className="text-xs text-muted-foreground">Endpoint</Text>
                            <Text selectable className="text-sm text-foreground">
                                {endpoint ?? 'Set EXPO_PUBLIC_API_BASE_URL to enable API calls on native builds.'}
                            </Text>
                        </View>

                        {status && (
                            <View
                                className={
                                    status.type === 'success'
                                        ? 'rounded-md border border-primary/30 bg-primary/10 p-3'
                                        : 'rounded-md border border-destructive/30 bg-destructive/10 p-3'
                                }
                            >
                                <Text
                                    selectable
                                    className={status.type === 'success' ? 'text-sm text-primary' : 'text-sm text-destructive'}
                                >
                                    {status.message}
                                </Text>
                            </View>
                        )}

                        <Button onPress={handleSendTestEmail} disabled={!canSend} className="h-11">
                            {isSending ? <ActivityIndicator color="white" size="small" /> : null}
                            <Text>{isSending ? 'Sending...' : 'Send test email'}</Text>
                        </Button>
                    </CardContent>
                </Card>
            </ScrollView>
        </>
    );
}