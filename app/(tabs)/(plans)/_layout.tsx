import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const screenOptions = {
  headerShadowVisible: false,
  ...(Platform.OS === 'ios'
    ? {
        headerTransparent: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' as const },
        headerLargeTitle: true,
        headerBlurEffect: 'systemChromeMaterial' as const,
        headerBackButtonDisplayMode: 'minimal' as const,
      }
    : {}),
};

export default function PlansTabLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Plans' }} />
    </Stack>
  );
}
