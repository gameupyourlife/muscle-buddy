import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionChips } from '@/components/ui/option-chips';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
    DAY_OPTIONS,
    TRACKING_MODE_OPTIONS,
    useWorkoutsData,
} from '@/lib/workouts/use-workouts';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlanEntryInputs = Record<string, { reps: string; weight: string }>;

export default function WorkoutTrackerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    suggestedTrackerExerciseLabel,
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
  const isCompact = width < 420;
  const contentPaddingTop = Math.max(12, insets.top + 4);
  const contentPaddingBottom = Math.max(28, insets.bottom + 20);

  const canStartSession = !isPlanMode || !!activePlan;

  useEffect(() => {
    if (!isPlanMode) {
      return;
    }

    setPlanEntryInputs((current) => {
      const next: PlanEntryInputs = {};

      for (const entry of selectedWorkoutDayPlanExercises) {
        const existing = current[entry.id];
        const lastPerformance = getLastPerformanceForExercise(entry.exerciseId);

        next[entry.id] =
          existing ?? {
            reps: String(lastPerformance?.reps ?? entry.targetReps),
            weight: String(lastPerformance?.weight ?? entry.targetWeight ?? 0),
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
    <>
      <Stack.Screen options={{ title: 'Tracker' }} />
      <ScrollView
        className="flex-1 bg-black"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 18,
        }}
      >
        <Text className="ml-4 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
          Workout Session
        </Text>

        <Card className="bg-[#1c1c1e] rounded-[28px] overflow-hidden border-0">
          <View className="p-4 gap-3">
            <Text className="text-white font-semibold">Tracker Flow</Text>
            <Text className="text-xs text-muted-foreground" selectable>
              1) Start session. 2) Log sets from plan or free mode. 3) Complete workout to sync XP and streak progress.
            </Text>
            <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
              <Button variant="outline" className="flex-1" onPress={() => router.push('/workouts/plans')}>
                <Text>Edit plans</Text>
              </Button>
              <Button variant="outline" className="flex-1" onPress={() => router.push('/workouts/food-tracking')}>
                <Text>Open food tracker</Text>
              </Button>
            </View>
          </View>
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[28px] overflow-hidden border-0">
          <View className="flex-row items-center justify-between p-4 border-b border-[#38383a]">
            <Text className="text-white text-base">Status</Text>
            <Badge variant={activeSession ? 'secondary' : 'outline'}>
              <Text>{activeSession ? 'In progress' : 'Not started'}</Text>
            </Badge>
          </View>
          <View className="p-4 gap-4">
            <View className="gap-2">
              <Label className="text-white" nativeID="tracking-mode">Training mode</Label>
              <OptionChips
                layout="wrap"
                items={TRACKING_MODE_OPTIONS}
                value={trackingMode}
                onValueChange={(value) => setTrackingMode((value as 'free' | 'plan') ?? 'free')}
              />
            </View>

            {isPlanMode ? (
              <View className="gap-2">
                <Label nativeID="workout-day">Workout day</Label>
                <OptionChips
                  layout="scroll"
                  size="sm"
                  items={DAY_OPTIONS}
                  value={selectedWorkoutDay}
                  onValueChange={setSelectedWorkoutDay}
                />
                <Text className="text-xs text-muted-foreground" selectable>
                  Plan day selected: {selectedWorkoutDayLabel}. Suggested next exercise: {suggestedTrackerExerciseLabel}
                </Text>
              </View>
            ) : null}

            {isPlanMode && !activePlan ? (
              <View className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <Text className="text-destructive" selectable>
                  No active plan selected. Choose a plan in the Plans tab first.
                </Text>
                <Button
                  className="mt-3"
                  variant="outline"
                  onPress={() => router.push('/workouts/plans')}
                >
                  <Text>Go to plans</Text>
                </Button>
              </View>
            ) : null}

            <Button onPress={startSession} disabled={isStartingSession || !!activeSession || !canStartSession} className="w-full">
              {isStartingSession ? <ActivityIndicator color="white" size="small" /> : null}
              <Text className="text-white">
                {activeSession
                  ? 'Session in progress'
                  : isPlanMode
                    ? 'Start plan session'
                    : 'Start free session'}
              </Text>
            </Button>
          </View>
        </Card>

        <Text className="ml-4 mt-1 mb-2 text-[13px] font-semibold uppercase text-[#8e8e93]">
          {isPlanMode ? 'Plan Exercises' : 'Log a Set'}
        </Text>
        <Card className="bg-[#1c1c1e] rounded-[28px] overflow-hidden border-0">
          <View className="gap-4 p-4">
            {isPlanMode ? (
              <>
                {selectedWorkoutDayPlanExercises.length > 0 ? (
                  <View className="gap-3">
                    {selectedWorkoutDayPlanExercises.map((entry) => {
                      const loggedSets = currentSessionSetCountByExercise[entry.exerciseId] ?? 0;
                      const isSuggested = entry.exerciseId === suggestedTrackerExerciseId;
                      const lastPerformance = getLastPerformanceForExercise(entry.exerciseId);
                      const entryInputs = planEntryInputs[entry.id] ?? {
                        reps: String(lastPerformance?.reps ?? entry.targetReps),
                        weight: String(lastPerformance?.weight ?? entry.targetWeight ?? 0),
                      };

                      return (
                        <View key={entry.id} className="gap-3 rounded-2xl border border-[#38383a] bg-black/20 p-4">
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="font-semibold">{entry.exercise.name}</Text>
                            <View className="flex-row items-center gap-2">
                              {isSuggested ? (
                                <Badge variant="secondary">
                                  <Text>Suggested</Text>
                                </Badge>
                              ) : null}
                              {loggedSets > 0 ? (
                                <Badge variant="outline">
                                  <Text>{loggedSets} set(s)</Text>
                                </Badge>
                              ) : null}
                            </View>
                          </View>

                          <Text className="text-xs text-muted-foreground" selectable>
                            Target: {entry.targetSets} x {entry.targetReps}
                            {typeof entry.targetWeight === 'number' ? ` @ ${entry.targetWeight} kg` : ''}
                          </Text>

                          {lastPerformance ? (
                            <Text className="text-xs text-muted-foreground" selectable>
                              Last performance: {lastPerformance.reps} reps @ {lastPerformance.weight} kg
                            </Text>
                          ) : (
                            <Text className="text-xs text-muted-foreground" selectable>
                              No previous entry yet.
                            </Text>
                          )}

                          <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                            <View className="flex-1 gap-2">
                              <Label>Reps</Label>
                              <Input
                                value={entryInputs.reps}
                                onChangeText={(value) => updatePlanEntryInput(entry.id, 'reps', value)}
                                keyboardType="numeric"
                              />
                            </View>
                            <View className="flex-1 gap-2">
                              <Label>Weight</Label>
                              <Input
                                value={entryInputs.weight}
                                onChangeText={(value) => updatePlanEntryInput(entry.id, 'weight', value)}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          <Button
                            variant="outline"
                            onPress={() => addSetForExercise(entry.exerciseId, entryInputs.reps, entryInputs.weight)}
                            disabled={!activeSession || isAddingSet}
                          >
                            {isAddingSet ? <ActivityIndicator color="black" size="small" /> : null}
                            <Text>{isAddingSet ? 'Saving set...' : 'Log set'}</Text>
                          </Button>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-sm text-muted-foreground" selectable>
                    No exercises are assigned for this plan day yet.
                  </Text>
                )}
              </>
            ) : (
              <>
                <View className="gap-2">
                  <Label nativeID="exercise-id">Machine or exercise</Label>
                  <OptionChips
                    layout="scroll"
                    size="sm"
                    items={trackerExerciseOptions}
                    value={trackerExerciseId}
                    onValueChange={setTrackerExerciseId}
                  />
                  <Text className="text-xs text-muted-foreground" selectable>
                    Selected: {selectedTrackerExerciseLabel}
                  </Text>
                  {trackerLastPerformance ? (
                    <Text className="text-xs text-muted-foreground" selectable>
                      Last performance: {trackerLastPerformance.reps} reps @ {trackerLastPerformance.weight} kg
                    </Text>
                  ) : (
                    <Text className="text-xs text-muted-foreground" selectable>
                      No previous entry yet.
                    </Text>
                  )}
                </View>

                <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                  <View className="flex-1 gap-2">
                    <Label nativeID="set-reps">Reps</Label>
                    <Input
                      aria-labelledby="set-reps"
                      value={reps}
                      onChangeText={setReps}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Label nativeID="set-weight">Weight</Label>
                    <Input
                      aria-labelledby="set-weight"
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Button onPress={addSet} disabled={!activeSession || isAddingSet} variant="outline">
                  {isAddingSet ? <ActivityIndicator color="black" size="small" /> : null}
                  <Text>{isAddingSet ? 'Saving set...' : 'Add set'}</Text>
                </Button>
              </>
            )}

            <Separator />

            {activeSession && sessionSetSummary.length > 0 ? (
              <View className="gap-2 rounded-2xl border border-[#38383a] bg-black/20 p-4">
                <Text className="text-sm font-semibold">Current session summary</Text>
                {sessionSetSummary.map((item) => (
                  <Text key={item.exerciseId} className="text-xs text-muted-foreground" selectable>
                    {item.label}: {item.count} set(s)
                  </Text>
                ))}
              </View>
            ) : null}

            <Button onPress={completeSession} disabled={!canCompleteSession || isCompletingSession}>
              {isCompletingSession ? <ActivityIndicator color="white" size="small" /> : null}
              <Text>{isCompletingSession ? 'Completing...' : 'Complete workout (+XP)'}</Text>
            </Button>

            {activeSession && !canCompleteSession ? (
              <Text className="text-xs text-muted-foreground" selectable>
                Log at least one set before completing this workout.
              </Text>
            ) : null}
          </View>
        </Card>

        {feedback ? (
          <View className="rounded-xl border border-primary/30 bg-primary/10 p-3">
            <Text className="text-primary" selectable>
              {feedback}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <Text className="text-destructive" selectable>
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
