import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VirtualMuscleBuddy } from '@/components/workouts/virtual-muscle-buddy';
import { LEVEL_THRESHOLDS } from '@/lib/workouts/constants';
import { useWorkoutsData } from '@/lib/workouts/use-workouts';
import { Stack, useRouter } from 'expo-router';
import { BoltIcon, ChevronRightIcon, FlameIcon, SaladIcon, TargetIcon } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WorkoutOverviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    dashboard,
    activeSession,
    isLoading,
    completed,
    target,
    progressValue,
    errorMessage,
    feedback,
    loadInitialData,
  } = useWorkoutsData();

  const level = dashboard?.gamification?.level ?? 1;
  const totalXp = dashboard?.gamification?.totalXp ?? 0;

  const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[level] ?? null;
  const xpIntoCurrentLevel = Math.max(0, totalXp - currentLevelThreshold);
  const xpRequiredForLevel =
    nextLevelThreshold !== null
      ? Math.max(1, nextLevelThreshold - currentLevelThreshold)
      : 1;
  const xpToNextLevel =
    nextLevelThreshold !== null
      ? Math.max(0, nextLevelThreshold - totalXp)
      : null;
  const progressToNextLevel =
    nextLevelThreshold !== null
      ? Math.min(100, Math.round((xpIntoCurrentLevel / xpRequiredForLevel) * 100))
      : 100;

  const progressSummary =
    target > 0
      ? progressValue >= 100
        ? 'Target reached. Keep the streak alive.'
        : `${target - completed} workout(s) left to hit your weekly target.`
      : 'Create a plan and set a weekly target to track consistency.';
  const contentPaddingTop = Math.max(20, insets.top + 8);
  const contentPaddingBottom = Math.max(40, insets.bottom + 24);

  return (
    <>
      <Stack.Screen options={{ title: 'Overview' }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 16,
        }}
      >
        <VirtualMuscleBuddy
          level={level}
          totalXp={totalXp}
          currentStreak={dashboard?.gamification?.currentStreak ?? 0}
          progressToNextLevel={progressToNextLevel}
          xpToNextLevel={xpToNextLevel}
        />

        <View className="rounded-3xl border border-border/60 bg-card p-4 gap-3">
          <Text className="text-sm font-semibold text-foreground" selectable>
            Start Here
          </Text>
          <Text className="text-xs text-muted-foreground leading-5" selectable>
            1) Open Plans and set your routine. 2) Start a session in Tracker and log sets. 3) Add meals in Food to keep nutrition aligned.
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push('/workouts/plans')}
              className="flex-1 rounded-xl border border-border/70 bg-black/20 px-3 py-2"
            >
              <Text className="text-xs font-medium text-foreground">Set up plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/workouts/tracker')}
              className="flex-1 rounded-xl border border-border/70 bg-black/20 px-3 py-2"
            >
              <Text className="text-xs font-medium text-foreground">Open tracker</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row gap-4">
          <TouchableOpacity 
            onPress={() => router.push('/workouts/tracker')}
            className="flex-1 bg-card rounded-2xl p-4 py-6 flex-col items-center justify-center gap-3 active:opacity-80">
            <Icon as={FlameIcon} size={28} className="text-foreground" />
            <Text className="font-semibold text-center text-foreground">
              {activeSession ? 'Resume workout' : 'Start workout'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/workouts/plans')}
            className="flex-1 bg-card rounded-2xl p-4 py-6 flex-col items-center justify-center gap-3 active:opacity-80">
            <Icon as={TargetIcon} size={28} className="text-foreground" />
            <Text className="font-semibold text-center text-foreground">
              Edit plans
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 mt-4 mb-1">
          ROUTINES & TOOLS
        </Text>

        <View className="bg-card rounded-3xl overflow-hidden">
          <TouchableOpacity onPress={() => router.push('/workouts/plans')} className="flex-row items-center justify-between p-4 active:bg-secondary/50">
            <Text className="text-base text-foreground font-medium">Edit workout plan</Text>
            <Icon as={ChevronRightIcon} size={18} className="text-muted-foreground" />
          </TouchableOpacity>
          <View className="h-[1px] bg-border/50 ml-4" />
          
          <TouchableOpacity onPress={() => router.push('/workouts/food-tracking')} className="flex-row items-center justify-between p-4 active:bg-secondary/50">
            <View className="flex-row items-center gap-2">
              <Icon as={SaladIcon} size={16} className="text-muted-foreground" />
              <Text className="text-base text-foreground font-medium">Log food</Text>
            </View>
            <Icon as={ChevronRightIcon} size={18} className="text-muted-foreground" />
          </TouchableOpacity>
          <View className="h-[1px] bg-border/50 ml-4" />
          
          <TouchableOpacity onPress={() => loadInitialData()} disabled={isLoading} className="flex-row items-center justify-between p-4 active:bg-secondary/50">
            <Text className="text-base text-foreground font-medium">{isLoading ? 'Syncing...' : 'Refresh data'}</Text>
            {isLoading && <ActivityIndicator size="small" />}
          </TouchableOpacity>
        </View>

        <View className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-3xl p-4 mt-2 flex-row gap-3">
          <Icon as={BoltIcon} size={20} className="text-blue-500 mt-0.5" />
          <View className="flex-1 gap-1">
            <Text className="text-blue-500 font-semibold" selectable>Weekly Momentum</Text>
            <Text className="text-blue-400 text-sm leading-5" selectable>
              {progressSummary} Current streak: {dashboard?.gamification?.currentStreak ?? 0} weeks.
            </Text>
          </View>
        </View>

        {feedback ? (
          <View className="rounded-2xl border border-primary/30 bg-primary/10 p-4 mt-2">
            <Text className="text-primary font-medium" selectable>
              {feedback}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 mt-2">
            <Text className="text-destructive font-medium" selectable>
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
