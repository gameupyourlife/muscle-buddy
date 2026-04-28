import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { OptionChips } from '@/components/ui/option-chips';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
    DAY_OPTIONS,
    TRACKING_MODE_OPTIONS,
    useWorkoutsData,
} from '@/lib/workouts/use-workouts';
import { useRouter } from 'expo-router';
import {
    CheckCircle2Icon,
    CircleIcon,
    ClipboardListIcon,
    DumbbellIcon,
    PlayIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type PlanEntryInputs = Record<string, { reps: string; weight: string }>;

export default function TrainScreen() {
  const router = useRouter();
  const {
    activePlan,
    activeSession,
    trackingMode,
    reps,
    weight,
    selectedWorkoutDay,
    selectedWorkoutDayLabel,
    selectedWorkoutDayPlanExercises,
    currentSessionSetCountByExercise,
    trackerExerciseId,
    trackerExerciseOptions,
    suggestedTrackerExerciseId,
    trackerLastPerformance,
    selectedTrackerExerciseLabel,
    canCompleteSession,
    isStartingSession,
    isAddingSet,
    isCompletingSession,
    feedback,
    errorMessage,
    getLastPerformanceForExercise,
    setReps,
    setWeight,
    setTrackingMode,
    setSelectedWorkoutDay,
    setTrackerExerciseId,
    startSession,
    addSetForExercise,
    addSet,
    completeSession,
  } = useWorkoutsData();

  const [planEntryInputs, setPlanEntryInputs] = useState<PlanEntryInputs>({});

  const isPlanMode = trackingMode === 'plan';
  const canStartSession = !isPlanMode || !!activePlan;

  useEffect(() => {
    if (!isPlanMode) return;
    setPlanEntryInputs((current) => {
      const next: PlanEntryInputs = {};
      for (const entry of selectedWorkoutDayPlanExercises) {
        const existing = current[entry.id];
        const last = getLastPerformanceForExercise(entry.exerciseId);
        next[entry.id] =
          existing ?? {
            reps: String(last?.reps ?? entry.targetReps),
            weight: String(last?.weight ?? entry.targetWeight ?? 0),
          };
      }
      return next;
    });
  }, [getLastPerformanceForExercise, isPlanMode, selectedWorkoutDayPlanExercises]);

  const sessionSetSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const set of activeSession?.sets ?? []) {
      counts[set.exerciseId] = (counts[set.exerciseId] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([exerciseId, count]) => {
        const label =
          trackerExerciseOptions.find((option) => option.value === exerciseId)?.label ??
          selectedWorkoutDayPlanExercises.find((entry) => entry.exerciseId === exerciseId)?.exercise.name ??
          'Exercise';
        return { exerciseId, label, count };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeSession?.sets, selectedWorkoutDayPlanExercises, trackerExerciseOptions]);

  const totalSets = activeSession?.sets?.length ?? 0;

  const updatePlanEntryInput = (entryId: string, field: 'reps' | 'weight', value: string) => {
    setPlanEntryInputs((current) => ({
      ...current,
      [entryId]: {
        reps: current[entryId]?.reps ?? '8',
        weight: current[entryId]?.weight ?? '60',
        [field]: value,
      },
    }));
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      {/* Status hero */}
      <Surface
        className={
          activeSession ? 'border-primary/40 bg-primary/10' : ''
        }
      >
        <View className="flex-row items-center gap-3">
          <View
            className={
              'h-11 w-11 items-center justify-center rounded-2xl ' +
              (activeSession ? 'bg-primary' : 'bg-surface-muted')
            }
          >
            <Icon
              as={activeSession ? PlayIcon : DumbbellIcon}
              size={22}
              className={activeSession ? 'text-primary-foreground' : 'text-foreground'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-foreground">
              {activeSession ? 'Session in progress' : 'No active session'}
            </Text>
            <Text className="text-[13px] text-muted-foreground">
              {activeSession
                ? `${totalSets} set${totalSets === 1 ? '' : 's'} logged · ${
                    isPlanMode ? `Plan day · ${selectedWorkoutDayLabel}` : 'Free training'
                  }`
                : isPlanMode && activePlan
                  ? `Ready to start ${activePlan.name}`
                  : 'Start a free or plan-based session below'}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Mode picker */}
      <SectionHeader title="Training Mode" />
      <Surface>
        <OptionChips
          layout="wrap"
          items={TRACKING_MODE_OPTIONS}
          value={trackingMode}
          onValueChange={(value) => setTrackingMode((value as 'free' | 'plan') ?? 'free')}
        />
        {isPlanMode ? (
          <View className="gap-2 mt-2">
            <Label nativeID="workout-day">Plan day</Label>
            <OptionChips
              layout="scroll"
              size="sm"
              items={DAY_OPTIONS}
              value={selectedWorkoutDay}
              onValueChange={setSelectedWorkoutDay}
            />
          </View>
        ) : null}
      </Surface>

      {isPlanMode && !activePlan ? (
        <Banner
          tone="warning"
          title="No active plan"
          message="Create or activate a plan in the Plans tab to use plan day training."
        />
      ) : null}

      {/* Start / complete actions */}
      {!activeSession ? (
        <Button
          onPress={startSession}
          disabled={isStartingSession || !canStartSession}
          size="lg"
        >
          {isStartingSession ? (
            <ActivityIndicator size="small" color="white" />
          ) : null}
          <Text>
            {isStartingSession
              ? 'Starting…'
              : isPlanMode
                ? 'Start plan session'
                : 'Start free session'}
          </Text>
        </Button>
      ) : (
        <Button
          onPress={completeSession}
          disabled={!canCompleteSession || isCompletingSession}
          size="lg"
        >
          {isCompletingSession ? (
            <ActivityIndicator size="small" color="white" />
          ) : null}
          <Text>{isCompletingSession ? 'Completing…' : 'Complete workout · earn XP'}</Text>
        </Button>
      )}

      {/* Log a set */}
      <SectionHeader
        title={isPlanMode ? 'Plan Exercises' : 'Log a Set'}
        description={
          activeSession
            ? undefined
            : 'Start a session above to begin logging sets.'
        }
      />

      {isPlanMode ? (
        selectedWorkoutDayPlanExercises.length === 0 ? (
          <Surface>
            <EmptyState
              compact
              icon={ClipboardListIcon}
              title="Nothing scheduled"
              description={`No exercises planned for ${selectedWorkoutDayLabel}.`}
              actionLabel="Edit plan"
              onAction={() => router.push('/(tabs)/(plans)')}
            />
          </Surface>
        ) : (
          <View className="gap-3">
            {selectedWorkoutDayPlanExercises.map((entry) => {
              const loggedSets = currentSessionSetCountByExercise[entry.exerciseId] ?? 0;
              const isSuggested = entry.exerciseId === suggestedTrackerExerciseId;
              const last = getLastPerformanceForExercise(entry.exerciseId);
              const inputs = planEntryInputs[entry.id] ?? {
                reps: String(last?.reps ?? entry.targetReps),
                weight: String(last?.weight ?? entry.targetWeight ?? 0),
              };
              const completedAll = loggedSets >= entry.targetSets;
              return (
                <Surface key={entry.id}>
                  <View className="flex-row items-center gap-3">
                    <Icon
                      as={completedAll ? CheckCircle2Icon : CircleIcon}
                      size={20}
                      className={completedAll ? 'text-success' : 'text-muted-foreground'}
                    />
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-foreground">
                        {entry.exercise.name}
                      </Text>
                      <Text className="text-[13px] text-muted-foreground">
                        {entry.targetSets} × {entry.targetReps}
                        {typeof entry.targetWeight === 'number' ? ` · ${entry.targetWeight} kg` : ''}
                        {' · '}
                        {loggedSets} logged
                        {isSuggested && !completedAll ? ' · suggested next' : ''}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1.5">
                      <Label>Reps</Label>
                      <Input
                        value={inputs.reps}
                        onChangeText={(value) => updatePlanEntryInput(entry.id, 'reps', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Label>Weight (kg)</Label>
                      <Input
                        value={inputs.weight}
                        onChangeText={(value) => updatePlanEntryInput(entry.id, 'weight', value)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Button
                    variant={isSuggested ? 'default' : 'outline'}
                    onPress={() =>
                      addSetForExercise(entry.exerciseId, inputs.reps, inputs.weight)
                    }
                    disabled={!activeSession || isAddingSet}
                  >
                    {isAddingSet ? <ActivityIndicator size="small" /> : null}
                    <Text>{isAddingSet ? 'Saving…' : 'Log set'}</Text>
                  </Button>
                </Surface>
              );
            })}
          </View>
        )
      ) : (
        <Surface>
          <View className="gap-1.5">
            <Label>Exercise</Label>
            <OptionChips
              layout="scroll"
              size="sm"
              items={trackerExerciseOptions}
              value={trackerExerciseId}
              onValueChange={setTrackerExerciseId}
            />
            <Text className="text-[12px] text-muted-foreground" selectable>
              {selectedTrackerExerciseLabel}
              {trackerLastPerformance
                ? ` · last: ${trackerLastPerformance.reps} × ${trackerLastPerformance.weight} kg`
                : ' · no previous entry'}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Label nativeID="set-reps">Reps</Label>
              <Input
                aria-labelledby="set-reps"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Label nativeID="set-weight">Weight (kg)</Label>
              <Input
                aria-labelledby="set-weight"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Button onPress={addSet} disabled={!activeSession || isAddingSet} variant="default">
            {isAddingSet ? <ActivityIndicator size="small" /> : null}
            <Text>{isAddingSet ? 'Saving…' : 'Add set'}</Text>
          </Button>
        </Surface>
      )}

      {/* Session summary */}
      {activeSession && sessionSetSummary.length > 0 ? (
        <>
          <SectionHeader title="Today's Session" />
          <ListGroup>
            {sessionSetSummary.map((item) => (
              <ListRow
                key={item.exerciseId}
                title={item.label}
                value={`${item.count} set${item.count === 1 ? '' : 's'}`}
                showChevron={false}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
    </Screen>
  );
}
