import { authClient } from '@/lib/auth-client';
import { Platform } from 'react-native';

export function createAuthenticatedRequestInit(
  apiBaseUrl: string,
  init?: RequestInit
): RequestInit {
  const headers = new Headers(init?.headers);

  headers.set('Content-Type', 'application/json');

  if (apiBaseUrl.includes('ngrok')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  if (Platform.OS !== 'web') {
    const cookies = authClient.getCookie();

    if (cookies) {
      headers.set('Cookie', cookies);
    }
  }

  return {
    ...init,
    headers,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  };
}
