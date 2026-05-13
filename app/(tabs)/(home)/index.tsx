import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { ListRow } from '@/components/ui/list-row';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { VirtualMuscleBuddy } from '@/components/workouts/virtual-muscle-buddy';
import { authClient } from '@/lib/auth-client';
import { getCharacterSelectionFromGamification } from '@/lib/workouts/character';
import { LEVEL_THRESHOLDS } from '@/lib/workouts/constants';
import { useWorkoutsData } from '@/lib/workouts/use-workouts';
import { Stack, useRouter } from 'expo-router';
import {
    ChevronRightIcon,
    ClipboardListIcon,
    DumbbellIcon,
    FlameIcon,
    PlayCircleIcon,
    SaladIcon,
    TrendingUpIcon,
    UsersIcon,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const {
    dashboard,
    activeSession,
    isLoading,
    completed,
    target,
    progressValue,
    errorMessage,
    feedback,
    refreshNow,
    isSavingCharacterSelection,
    updateCharacterSelection,
  } = useWorkoutsData();

  const level = dashboard?.gamification?.level ?? 1;
  const totalXp = dashboard?.gamification?.totalXp ?? 0;
  const currentStreak = dashboard?.gamification?.currentStreak ?? 0;
  const characterSelection = getCharacterSelectionFromGamification(dashboard?.gamification);

  const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[level] ?? null;
  const xpIntoCurrentLevel = Math.max(0, totalXp - currentLevelThreshold);
  const xpRequiredForLevel =
    nextLevelThreshold !== null ? Math.max(1, nextLevelThreshold - currentLevelThreshold) : 1;
  const xpToNextLevel =
    nextLevelThreshold !== null ? Math.max(0, nextLevelThreshold - totalXp) : null;
  const progressToNextLevel =
    nextLevelThreshold !== null
      ? Math.min(100, Math.round((xpIntoCurrentLevel / xpRequiredForLevel) * 100))
      : 100;

  const remaining = Math.max(0, target - completed);

  return (
    <Screen
      refreshing={isLoading}
      onRefresh={refreshNow}
      className="bg-[#f6f8fb]"
      contentContainerStyle={{ paddingTop: 8 }}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/(tabs)/(home)/me')} hitSlop={8}>
              <UserAvatar
                name={user?.name}
                email={user?.email}
                imageUrl={user?.image ?? undefined}
                size={32}
              />
            </Pressable>
          ),
        }}
      />

      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}

      {/* Hero — virtual muscle buddy */}
      <Surface padded={false} className="-mx-4 overflow-hidden rounded-none border-0 bg-transparent">
        <VirtualMuscleBuddy
          level={level}
          totalXp={totalXp}
          currentStreak={currentStreak}
          progressToNextLevel={progressToNextLevel}
          xpIntoCurrentLevel={xpIntoCurrentLevel}
          xpRequiredForLevel={xpRequiredForLevel}
          xpToNextLevel={xpToNextLevel}
          characterSelection={characterSelection}
          isSavingCharacterSelection={isSavingCharacterSelection}
          onCharacterSelectionChange={updateCharacterSelection}
        />
      </Surface>

      {/* Active session banner */}
      {activeSession ? (
        <Pressable onPress={() => router.push('/(tabs)/(train)')}>
          <Surface className="border-primary/40 bg-primary/10">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                <Icon as={PlayCircleIcon} size={22} className="text-primary-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">Workout in progress</Text>
                <Text className="text-[13px] text-muted-foreground">
                  Tap to resume tracking your sets.
                </Text>
              </View>
              <Icon as={ChevronRightIcon} size={18} className="text-muted-foreground" />
            </View>
          </Surface>
        </Pressable>
      ) : null}

      {/* Quick stats */}
      <SectionHeader title="This Week" />
      <View className="flex-row gap-3">
        <StatTile
          label="Completed"
          value={completed}
          unit={`/ ${target || '—'}`}
          icon={DumbbellIcon}
          tone="primary"
          trend={target > 0 ? `${Math.round(progressValue)}% of weekly target` : 'No target set'}
        />
        <StatTile
          label="Streak"
          value={currentStreak}
          unit="weeks"
          icon={FlameIcon}
          tone={currentStreak > 0 ? 'warning' : 'default'}
          trend={currentStreak > 0 ? 'Keep it going' : 'Start your streak'}
        />
      </View>

      {/* Weekly momentum */}
      <Banner
        tone={progressValue >= 100 ? 'success' : remaining === 0 && target === 0 ? 'info' : 'info'}
        title="Weekly momentum"
        message={
          target > 0
            ? progressValue >= 100
              ? `Target reached. ${currentStreak}-week streak active.`
              : `${remaining} more workout${remaining === 1 ? '' : 's'} to hit your weekly goal.`
            : 'Set a weekly target in Plans to track consistency.'
        }
      />

      {/* Quick actions */}
      <SectionHeader title="Quick Actions" />
      <ListGroup>
        <ListRow
          icon={DumbbellIcon}
          title={activeSession ? 'Resume workout' : 'Start a workout'}
          subtitle={activeSession ? 'Continue your active session' : 'Track sets, reps, and weight'}
          onPress={() => router.push('/(tabs)/(train)')}
        />
        <ListRow
          icon={ClipboardListIcon}
          title="Edit training plan"
          subtitle="Adjust exercises, targets, and weekly volume"
          onPress={() => router.push('/(tabs)/(plans)')}
        />
        <ListRow
          icon={SaladIcon}
          title="Log a meal"
          subtitle="Track calories and macros"
          onPress={() => router.push('/(tabs)/(food)')}
        />
        <ListRow
          icon={UsersIcon}
          title="Find a gym buddy"
          subtitle="Train with someone in your area"
          onPress={() => router.push('/(tabs)/(buddies)')}
        />
      </ListGroup>

      {/* Recent activity */}
      <SectionHeader
        title="Recent Activity"
        action={
          <Pressable onPress={() => router.push('/(tabs)/(train)')} hitSlop={8}>
            <Text className="text-[14px] font-medium text-primary">View all</Text>
          </Pressable>
        }
      />
      {dashboard?.recentSessions && dashboard.recentSessions.length > 0 ? (
        <ListGroup>
          {dashboard.recentSessions.slice(0, 3).map((session) => {
            const date = new Date(session.startedAt);
            const dateLabel = date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            return (
              <ListRow
                key={session.id}
                icon={TrendingUpIcon}
                title={dateLabel}
                subtitle={`Status: ${session.status.replace('_', ' ')}`}
                showChevron={false}
              />
            );
          })}
        </ListGroup>
      ) : (
        <Surface>
          <EmptyState
            compact
            icon={DumbbellIcon}
            title="No workouts yet"
            description="Start your first session and your streak will begin."
            actionLabel="Start workout"
            onAction={() => router.push('/(tabs)/(train)')}
          />
        </Surface>
      )}

      {/* Profile shortcut */}
      <SectionHeader title="Account" />
      <ListGroup>
        <ListRow
          icon={UsersIcon}
          title={user?.name || 'Profile'}
          subtitle={user?.email}
          onPress={() => router.push('/(tabs)/(home)/me')}
        />
      </ListGroup>
    </Screen>
  );
}
