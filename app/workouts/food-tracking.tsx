import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FoodTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentPaddingTop = Math.max(12, insets.top + 4);
  const contentPaddingBottom = Math.max(28, insets.bottom + 20);

  return (
    <>
      <Stack.Screen options={{ title: 'Food Tracking' }} />
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
        <Text className="ml-4 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
          Nutrition Companion
        </Text>
        <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
            <Text className="text-white font-semibold">Status</Text>
            <Badge variant="secondary">
              <Text>Coming soon</Text>
            </Badge>
          </View>
          <View className="border-b border-[#38383a] p-4">
            <Text className="text-white leading-6" selectable>
              Track calories and macros in the same flow as your workouts.
            </Text>
          </View>
          <View className="border-b border-[#38383a] p-4">
            <Text className="text-[#8e8e93] leading-6" selectable>
              Planned first version: quick meal logging, daily protein target, and weekly nutrition trends.
            </Text>
          </View>
          <View className="p-4">
            <Button variant="outline" onPress={() => router.push('/workouts/overview')} className="w-full">
              <Text className="text-white">Back to workout overview</Text>
            </Button>
          </View>
        </View>

        <Text className="ml-4 mt-1 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
          What is next?
        </Text>
        <View className="bg-[#1c1c1e] rounded-[28px] overflow-hidden">
          <View className="border-b border-[#38383a] p-4">
            <Text className="text-white leading-6" selectable>
              Fast meal entry with recent foods
            </Text>
          </View>
          <View className="border-b border-[#38383a] p-4">
            <Text className="text-white leading-6" selectable>
              Macro split by training day
            </Text>
          </View>
          <View className="p-4">
            <Text className="text-white leading-6" selectable>
              Weekly nutrition score and recommendations
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
