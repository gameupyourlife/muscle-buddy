import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { Link, Stack } from 'expo-router';
import { MoonStarIcon, XIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Image, type ImageStyle, View } from 'react-native';

const LOGO = {
    light: require('@/assets/images/react-native-reusables-light.png'),
    dark: require('@/assets/images/react-native-reusables-dark.png'),
};

const CLERK_LOGO = {
    light: require('@/assets/images/clerk-logo-light.png'),
    dark: require('@/assets/images/clerk-logo-dark.png'),
};

const LOGO_STYLE: ImageStyle = {
    height: 36,
    width: 40,
};

const SCREEN_OPTIONS = {
    header: () => (
        <View className="top-safe absolute left-0 right-0 flex-row justify-between px-4 py-2 web:mx-2">
            <ThemeToggle />
        </View>
    ),
};

export default function Screen() {
    const { colorScheme } = useColorScheme();
    const { data: session } = authClient.useSession();
    const showDeveloperOptions = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_MENU === 'true';

    const user = session?.user;

    return (
        <>
            <Stack.Screen options={SCREEN_OPTIONS} />
            <View className="flex-1 items-center justify-center gap-8 p-4">
                <View className="flex-row items-center justify-center gap-3.5">
                    <Image
                        source={CLERK_LOGO[colorScheme ?? 'light']}
                        resizeMode="contain"
                        style={LOGO_STYLE}
                    />
                    <Icon as={XIcon} className="mr-1 size-5" />
                    <Image source={LOGO[colorScheme ?? 'light']} style={LOGO_STYLE} resizeMode="contain" />
                </View>
                <View className="max-w-sm gap-2 px-4">
                    <Text variant="h1" className="text-3xl font-medium">
                        Make it yours{user?.name ?? ''}.
                    </Text>
                    <Text className="ios:text-foreground text-center font-mono text-sm text-muted-foreground">
                        Update the screens and components to match your design and logic.
                    </Text>
                </View>
                <View className="w-full max-w-sm gap-3">
                    <Button onPress={() => authClient.signOut()} variant="outline">
                        <Text>
                            Sign out
                        </Text>
                    </Button>

                    {showDeveloperOptions && (
                        <Link href="/dev-options" asChild>
                            <Button variant="secondary">
                                <Text>Developer options</Text>
                            </Button>
                        </Link>
                    )}
                </View>
            </View>
        </>
    );
}

const THEME_ICONS = {
    light: SunIcon,
    dark: MoonStarIcon,
};

function ThemeToggle() {
    const { colorScheme, toggleColorScheme } = useColorScheme();

    return (
        <Button onPress={toggleColorScheme} size="icon" variant="ghost" className="rounded-full">
            <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-6" />
        </Button>
    );
}
