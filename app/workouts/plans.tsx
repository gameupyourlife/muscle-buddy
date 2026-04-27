import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type Option } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import {
  DAY_OPTIONS,
  WEEKLY_TARGET_OPTIONS,
  useWorkoutsData,
} from '@/lib/workouts/use-workouts';
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WorkoutPlansScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    activePlan,
    templates,
    exercises,
    planEditorName,
    planEditorWeeklyTarget,
    planEditorExerciseId,
    planEditorExercises,
    isStartingPlanSetup,
    isSavingPlan,
    errorMessage,
    feedback,
    exerciseSelectOptions,
    setPlanEditorName,
    setPlanEditorWeeklyTarget,
    setPlanEditorExerciseId,
    addExerciseToPlanEditor,
    removePlanEditorExercise,
    updatePlanEditorExercise,
    createPlanFromTemplate,
    createEmptyPlan,
    savePlanChanges,
  } = useWorkoutsData();

  const selectedPlanEditorExerciseOption: Option =
    exerciseSelectOptions.find((option) => option.value === planEditorExerciseId) ?? undefined;

  const weeklyTargetOption: Option =
    WEEKLY_TARGET_OPTIONS.find((option) => option.value === planEditorWeeklyTarget) ?? undefined;

  const featuredTemplate = useMemo(() => templates[0] ?? null, [templates]);
  const additionalTemplates = useMemo(() => templates.slice(1), [templates]);
  const isCompact = width < 420;
  const contentPaddingTop = Math.max(20, insets.top + 8);
  const contentPaddingBottom = Math.max(40, insets.bottom + 24);

  return (
    <>
      <Stack.Screen options={{ title: 'Plans' }} />
      <ScrollView
        className="flex-1 bg-background dark:bg-black"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 24,
        }}
      >
        <View className="gap-2">
          <Text className="ml-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Plan
          </Text>
          <Card className="overflow-hidden rounded-3xl border-border bg-card/95">
          <CardHeader>
            <View className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-xl">Plan Studio</CardTitle>
              <Badge variant={activePlan ? 'secondary' : 'outline'}>
                <Text>{activePlan ? 'Active plan' : 'No active plan'}</Text>
              </Badge>
            </View>
            <CardDescription>
              Build a weekly structure that you can actually follow. Keep it simple and editable.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {!activePlan ? (
              <>
                <View className="rounded-xl border border-border/70 bg-card/80 p-3">
                  <Text className="text-sm text-muted-foreground" selectable>
                    Pick a starter template, then customize exercises, sets, reps, and weight targets.
                  </Text>
                </View>
                <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                  {featuredTemplate ? (
                    <Button
                      className="flex-1"
                      variant="secondary"
                      onPress={() => createPlanFromTemplate(featuredTemplate.id)}
                      disabled={isStartingPlanSetup}
                    >
                      {isStartingPlanSetup ? <ActivityIndicator color="black" size="small" /> : null}
                      <Text>{isStartingPlanSetup ? 'Starting...' : `Use ${featuredTemplate.name}`}</Text>
                    </Button>
                  ) : null}
                  <Button className="flex-1" onPress={createEmptyPlan} disabled={isStartingPlanSetup}>
                    {isStartingPlanSetup ? <ActivityIndicator color="white" size="small" /> : null}
                    <Text>{isStartingPlanSetup ? 'Creating...' : 'Start empty plan'}</Text>
                  </Button>
                </View>
              </>
            ) : null}

            {activePlan ? (
              <>
                <View className="gap-2">
                  <Label nativeID="plan-name">Plan name</Label>
                  <Input
                    aria-labelledby="plan-name"
                    value={planEditorName}
                    onChangeText={setPlanEditorName}
                    placeholder="My personalized plan"
                  />
                </View>

                <View className="gap-2">
                  <Label nativeID="plan-target">Weekly target</Label>
                  <Select
                    value={weeklyTargetOption}
                    onValueChange={(option) => setPlanEditorWeeklyTarget(option?.value ?? '3')}
                  >
                    <SelectTrigger aria-labelledby="plan-target">
                      <SelectValue placeholder="Pick weekly target" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKLY_TARGET_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} label={option.label} />
                      ))}
                    </SelectContent>
                  </Select>
                </View>

                <View className="gap-2">
                  <Label nativeID="plan-add-exercise">Add exercise</Label>
                  <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                    <View className="flex-1">
                      <Select
                        value={selectedPlanEditorExerciseOption}
                        onValueChange={(option) => setPlanEditorExerciseId(option?.value ?? '')}
                      >
                        <SelectTrigger aria-labelledby="plan-add-exercise">
                          <SelectValue placeholder="Choose exercise" />
                        </SelectTrigger>
                        <SelectContent>
                          {exerciseSelectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} label={option.label} />
                          ))}
                        </SelectContent>
                      </Select>
                    </View>
                    <Button
                      variant="outline"
                      onPress={addExerciseToPlanEditor}
                      disabled={exerciseSelectOptions.length === 0}
                    >
                      <Text>Add to plan</Text>
                    </Button>
                  </View>
                </View>

                {planEditorExercises.length === 0 ? (
                  <Text className="text-sm text-muted-foreground" selectable>
                    Add at least one exercise to personalize your plan.
                  </Text>
                ) : null}

                {planEditorExercises.map((entry) => {
                  const exercise = exercises.find((item) => item.id === entry.exerciseId);
                  const dayOption: Option =
                    DAY_OPTIONS.find((day) => day.value === String(entry.dayOfWeek)) ?? undefined;

                  return (
                    <View key={entry.key} className="gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="font-semibold">{exercise?.name || 'Unknown exercise'}</Text>
                        <Button variant="ghost" size="sm" onPress={() => removePlanEditorExercise(entry.key)}>
                          <Text>Remove</Text>
                        </Button>
                      </View>

                      <View className="gap-2">
                        <Label>Workout day</Label>
                        <Select
                          value={dayOption}
                          onValueChange={(option) => {
                            const value = Number(option?.value ?? 1);
                            updatePlanEditorExercise(entry.key, { dayOfWeek: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value} label={option.label} />
                            ))}
                          </SelectContent>
                        </Select>
                      </View>

                      <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                        <View className="flex-1 gap-2">
                          <Label>Sets</Label>
                          <Input
                            value={entry.targetSets}
                            onChangeText={(value) => updatePlanEditorExercise(entry.key, { targetSets: value })}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1 gap-2">
                          <Label>Reps</Label>
                          <Input
                            value={entry.targetReps}
                            onChangeText={(value) => updatePlanEditorExercise(entry.key, { targetReps: value })}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="flex-1 gap-2">
                          <Label>Weight</Label>
                          <Input
                            value={entry.targetWeight}
                            onChangeText={(value) => updatePlanEditorExercise(entry.key, { targetWeight: value })}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                <Separator />

                <Button onPress={savePlanChanges} disabled={isSavingPlan}>
                  {isSavingPlan ? <ActivityIndicator color="white" size="small" /> : null}
                  <Text>{isSavingPlan ? 'Saving...' : 'Save plan changes'}</Text>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
        </View>

        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle>Starter Templates</CardTitle>
            <CardDescription>
              Pick a starting point and adapt it to your routine.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {templates.length === 0 ? (
              <Text className="text-sm text-muted-foreground" selectable>
                No templates available right now.
              </Text>
            ) : null}

            {featuredTemplate ? (
              <View className="gap-3 rounded-xl border border-border/60 bg-primary/5 p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-semibold">{featuredTemplate.name}</Text>
                  <Badge variant="outline">
                    <Text>{featuredTemplate.weeklyTarget}/week</Text>
                  </Badge>
                </View>
                <Text className="text-xs text-muted-foreground" selectable>
                  {featuredTemplate.description || 'No description'}
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => createPlanFromTemplate(featuredTemplate.id)}
                  disabled={isStartingPlanSetup}
                >
                  {isStartingPlanSetup ? <ActivityIndicator color="black" size="small" /> : null}
                  <Text>{isStartingPlanSetup ? 'Starting...' : 'Use this template'}</Text>
                </Button>
              </View>
            ) : null}

            {additionalTemplates.map((template) => (
              <View key={template.id} className="gap-2 rounded-xl border border-border/60 p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-semibold">{template.name}</Text>
                  <Badge variant="outline">
                    <Text>{template.weeklyTarget}/week</Text>
                  </Badge>
                </View>
                <Text className="text-xs text-muted-foreground" selectable>
                  {template.description || 'No description'}
                </Text>
                <Button
                  variant="outline"
                  onPress={() => createPlanFromTemplate(template.id)}
                  disabled={isStartingPlanSetup}
                >
                  <Text>Use template</Text>
                </Button>
              </View>
            ))}

            <Button onPress={createEmptyPlan} disabled={isStartingPlanSetup}>
              {isStartingPlanSetup ? <ActivityIndicator color="white" size="small" /> : null}
              <Text>{isStartingPlanSetup ? 'Creating...' : 'Create empty plan instead'}</Text>
            </Button>
          </CardContent>
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
