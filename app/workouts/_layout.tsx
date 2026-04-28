import { Icon } from '@/components/ui/icon';
import { Tabs } from 'expo-router';
import { ClipboardListIcon, DumbbellIcon, HouseIcon, SaladIcon, Settings2Icon, UsersIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WorkoutsLayout() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 8);

  const activeTintColor = '#ffffff';
  const inactiveTintColor = '#8e8e93';
  const tabBarBackground = '#000000';
  const tabBarBorder = '#1c1c1e';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#ffffff',
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: {
          height: 58 + safeBottom,
          paddingTop: 6,
          paddingBottom: safeBottom,
          borderTopWidth: 1,
          borderTopColor: tabBarBorder,
          backgroundColor: tabBarBackground,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Icon as={HouseIcon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarLabel: 'Train',
          tabBarIcon: ({ color, size }) => <Icon as={DumbbellIcon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarLabel: 'Plan',
          tabBarIcon: ({ color, size }) => <Icon as={ClipboardListIcon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="food-tracking"
        options={{
          title: 'Food Tracking',
          tabBarLabel: 'Food',
          tabBarIcon: ({ color, size }) => <Icon as={SaladIcon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarLabel: 'Buddy',
          tabBarIcon: ({ color, size }) => <Icon as={UsersIcon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Me',
          tabBarIcon: ({ color, size }) => <Icon as={Settings2Icon} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
