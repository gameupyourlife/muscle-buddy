import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type SendStatus =
  | { tone: 'success' | 'destructive'; message: string }
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

export default function DevOptionsScreen() {
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
    if (!to && userEmail) setTo(userEmail);
  }, [session?.user?.email, to]);

  const canSend =
    !!endpoint &&
    to.trim().length > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !isSending;

  const handleSend = async () => {
    if (!canSend || !endpoint) return;
    setStatus(null);
    setIsSending(true);
    try {
      const cookies = authClient.getCookie();
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (cookies) headers.set('Cookie', cookies);

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

      const body = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || `Send failed (${response.status})`);
      }

      setStatus({
        tone: 'success',
        message: `Test email sent. Message id: ${body?.id || 'unknown'}`,
      });
    } catch (error) {
      setStatus({
        tone: 'destructive',
        message: getErrorMessage(error, 'Unable to send test email.'),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      <SectionHeader
        title="Test Email"
        description="Send a transactional email to verify Resend is configured."
      />
      <Surface>
        <View className="gap-1.5">
          <Label>To</Label>
          <Input
            value={to}
            onChangeText={setTo}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>
        <View className="gap-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChangeText={setSubject} />
        </View>
        <View className="gap-1.5">
          <Label>Message</Label>
          <Textarea value={message} onChangeText={setMessage} numberOfLines={5} />
        </View>
        <Button onPress={handleSend} disabled={!canSend}>
          {isSending ? <ActivityIndicator size="small" color="white" /> : null}
          <Text>{isSending ? 'Sending…' : 'Send test email'}</Text>
        </Button>
      </Surface>

      <SectionHeader title="API" />
      <Surface>
        <Text className="text-[13px] text-muted-foreground">Endpoint</Text>
        <Text className="text-[13px] text-foreground" selectable>
          {endpoint ?? 'Set EXPO_PUBLIC_API_BASE_URL to enable API calls on native builds.'}
        </Text>
      </Surface>

      {status ? <Banner tone={status.tone} message={status.message} /> : null}
    </Screen>
  );
}
