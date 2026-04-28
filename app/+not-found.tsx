import { Link, Stack } from 'expo-router';
import { Screen, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
        <Surface>
          <Text className="text-[18px] font-semibold">This screen does not exist.</Text>
          <Link href="/" asChild>
            <Text className="text-[15px] font-medium text-primary">Go to home screen</Text>
          </Link>
        </Surface>
      </Screen>
    </>
  );
}
