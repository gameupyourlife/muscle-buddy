import '@/global.css';
import { authClient } from '@/lib/auth-client';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Routes />
      <PortalHost />
    </ThemeProvider>
  );
}

SplashScreen.preventAutoHideAsync();

const HIDDEN = { headerShown: false } as const;

function Routes() {
  const { data: session, isPending } = authClient.useSession();
  const isSignedIn = !!session?.user;

  React.useEffect(() => {
    if (!isPending) {
      SplashScreen.hideAsync();
    }
  }, [isPending]);

  if (isPending) {
    return null;
  }

  return (
    <Stack screenOptions={HIDDEN}>
      {/* Public auth flow */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)/sign-in" options={HIDDEN} />
        <Stack.Screen name="(auth)/sign-up" options={HIDDEN} />
        <Stack.Screen name="(auth)/forgot-password" options={HIDDEN} />
        <Stack.Screen name="(auth)/reset-password" options={HIDDEN} />
      </Stack.Protected>

      {/* Authenticated app */}
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" options={HIDDEN} />
        <Stack.Screen name="(tabs)" options={HIDDEN} />
      </Stack.Protected>
    </Stack>
  );
}
