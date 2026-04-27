import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import { Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

type SendStatus =
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
    | null;

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
            const cookies = authClient.getCookie();
            const headers = new Headers({
                'Content-Type': 'application/json',
            });

            if (cookies) {
                headers.set('Cookie', cookies);
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                credentials: 'omit',
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
                className="flex-1 bg-black"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text className="text-[#8e8e93] text-[13px] uppercase font-semibold ml-4 mb-2 mt-6">
                    Test Email
                </Text>
                <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4">To</Text>
                        <Input
                            aria-labelledby="dev-email-to"
                            value={to}
                            onChangeText={setTo}
                            placeholder="you@example.com"
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            className="flex-1 text-right border-0 bg-transparent h-auto"
                        />
                    </View>

                    <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mr-4">Subject</Text>
                        <Input
                            aria-labelledby="dev-email-subject"
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="Enter an email subject"
                            className="flex-1 text-right border-0 bg-transparent h-auto"
                        />
                    </View>

                    <View className="flex-col justify-start p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mb-2">Message</Text>
                        <Input
                            aria-labelledby="dev-email-message"
                            value={message}
                            onChangeText={setMessage}
                            placeholder="Enter the email text body"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            className="w-full border-0 bg-transparent min-h-[112px] p-0"
                        />
                    </View>

                    <View className="flex-col justify-start p-4 border-b border-[#38383a]">
                        <Text className="text-white text-[17px] mb-1">Endpoint</Text>
                        <Text selectable className="text-[#8e8e93] text-[13px]">
                            {endpoint ?? 'Set EXPO_PUBLIC_API_BASE_URL to enable API calls on native builds.'}
                        </Text>
                    </View>

                    {status && (
                        <View className="flex-col justify-start p-4 border-b border-[#38383a]">
                            <Text
                                selectable
                                className={status.type === 'success' ? 'text-green-500 text-[15px]' : 'text-red-500 text-[15px]'}
                            >
                                {status.message}
                            </Text>
                        </View>
                    )}

                    <Button 
                        variant="ghost"
                        onPress={handleSendTestEmail} 
                        disabled={!canSend} 
                        className="flex-row items-center justify-center p-4 h-auto rounded-none border-0"
                    >
                        {isSending ? <ActivityIndicator color="white" size="small" className="mr-2" /> : null}
                        <Text className="text-white text-[17px]">{isSending ? 'Sending...' : 'Send test email'}</Text>
                    </Button>
                </View>
            </ScrollView>
        </>
    );
}