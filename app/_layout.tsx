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
        <Stack>
            {/* Screens only shown when the user is NOT signed in */}
            <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
                <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />
                <Stack.Screen name="(auth)/reset-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
                <Stack.Screen name="(auth)/forgot-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
            </Stack.Protected>

            {/* Screens only shown when the user IS signed in */}
            <Stack.Protected guard={isSignedIn}>
                <Stack.Screen name="index" />
                <Stack.Screen name="account" options={ACCOUNT_SCREEN_OPTIONS} />
                <Stack.Screen name="dev-options" options={DEV_OPTIONS_SCREEN_OPTIONS} />
            </Stack.Protected>

            {/* Screens outside the guards are accessible to everyone (e.g. not found) */}
        </Stack>
    );
}

const SIGN_IN_SCREEN_OPTIONS = {
    headerShown: false,
    title: 'Sign in',
};

const SIGN_UP_SCREEN_OPTIONS = {
    headerShown: false,
} as const;

const DEFAULT_AUTH_SCREEN_OPTIONS = {
    headerShown: false,
};

const DEV_OPTIONS_SCREEN_OPTIONS = {
    title: 'Developer Options',
};

const ACCOUNT_SCREEN_OPTIONS = {
    title: 'Account',
};
