import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UserSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentPaddingTop = Math.max(12, insets.top + 4);
  const contentPaddingBottom = Math.max(28, insets.bottom + 20);

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        className="flex-1 bg-black"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 18,
        }}
      >
        <View className="gap-2">
          <Text className="ml-4 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
            Quick Navigation
          </Text>
          <Card className="overflow-hidden rounded-[28px] border-0 bg-[#1c1c1e]">
            <View className="border-b border-[#38383a] p-4">
              <Text className="text-[14px] leading-5 text-[#8e8e93]" selectable>
                Jump directly to the most-used features.
              </Text>
            </View>
            <View className="p-4 gap-2">
              <Button variant="outline" onPress={() => router.push('/workouts/overview')}>
                <Text>Open home overview</Text>
              </Button>
              <Button variant="outline" onPress={() => router.push('/workouts/tracker')}>
                <Text>Open tracker</Text>
              </Button>
              <Button variant="outline" onPress={() => router.push('/workouts/plans')}>
                <Text>Open plans</Text>
              </Button>
              <Button variant="outline" onPress={() => router.push('/workouts/food-tracking')}>
                <Text>Open food tracker</Text>
              </Button>
            </View>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="ml-4 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
            Account & App
          </Text>
          <Card className="overflow-hidden rounded-[28px] border-0 bg-[#1c1c1e]">
            <View className="border-b border-[#38383a] p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[17px] font-medium text-white">Profile</Text>
                <Badge variant="outline">
                  <Text>Active</Text>
                </Badge>
              </View>
              <Text className="mt-1 text-[14px] leading-5 text-[#8e8e93]" selectable>
                Manage your account and app preferences.
              </Text>
            </View>
            <View className="border-b border-[#38383a] p-4">
              <Text className="text-[17px] font-medium text-white">Training preferences</Text>
              <Text className="mt-1 text-[14px] leading-5 text-[#8e8e93]" selectable>
                Units, default rep/weight values, and preferred training mode will live here.
              </Text>
            </View>
            <View className="border-b border-[#38383a] p-4">
              <Text className="text-[17px] font-medium text-white">Notifications</Text>
              <Text className="mt-1 text-[14px] leading-5 text-[#8e8e93]" selectable>
                Weekly reminders and streak alerts are planned for a future update.
              </Text>
            </View>
            <View className="p-4">
              <Text className="text-[17px] font-medium text-white">Connected services</Text>
              <Text className="mt-1 text-[14px] leading-5 text-[#8e8e93]" selectable>
                Sync with wearables and health apps will be added later.
              </Text>
            </View>
          </Card>
        </View>

        <View className="gap-2">
          <Text className="ml-4 mt-1 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
            Session
          </Text>
          <Card className="overflow-hidden rounded-[28px] border-0 bg-[#1c1c1e]">
            <View className="border-b border-[#38383a] p-4">
              <Text className="text-[14px] leading-5 text-[#8e8e93]" selectable>
                Sign out of your account on this device.
              </Text>
            </View>
            <View className="p-4">
              <Button onPress={() => authClient.signOut()} variant="destructive" className="w-full">
                <Text>Sign out</Text>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
