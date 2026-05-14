import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionChips } from '@/components/ui/option-chips';
import { Progress } from '@/components/ui/progress';
import { Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { DAY_OPTIONS, WEEKLY_TARGET_OPTIONS, useWorkoutsData } from '@/lib/workouts/use-workouts';
import { useRouter } from 'expo-router';
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  TrashIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

function getDayLabel(dayOfWeek: number | null | undefined) {
  if (!dayOfWeek) {
    return 'Any day';
  }

  return DAY_OPTIONS.find((option) => option.value === String(dayOfWeek))?.label ?? 'Day';
}

export default function PlansScreen() {
  const router = useRouter();
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
    completed,
    target,
    progressValue,
  } = useWorkoutsData();

  const [selectedEditorDay, setSelectedEditorDay] = useState('1');
  const featuredTemplate = useMemo(() => templates[0] ?? null, [templates]);
  const additionalTemplates = useMemo(() => templates.slice(1), [templates]);
  const activePlanDayGroups = useMemo(
    () =>
      DAY_OPTIONS.map((day) => {
        const entries =
          activePlan?.exercises
            .filter((entry) => String(entry.dayOfWeek ?? 1) === day.value)
            .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

        return { ...day, entries };
      }),
    [activePlan?.exercises]
  );
  const editorDayGroups = useMemo(
    () =>
      DAY_OPTIONS.map((day) => ({
        ...day,
        entries: planEditorExercises.filter((entry) => String(entry.dayOfWeek) === day.value),
      })),
    [planEditorExercises]
  );
  const selectedEditorDayEntries =
    editorDayGroups.find((day) => day.value === selectedEditorDay)?.entries ?? [];
  const editorExerciseCount = planEditorExercises.length;
  const editorDayCount = editorDayGroups.filter((day) => day.entries.length > 0).length;

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {/* Active plan card */}
      {activePlan ? (
        <Surface>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active plan
              </Text>
              <Text className="text-[20px] font-bold text-foreground" numberOfLines={1}>
                {activePlan.name}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {activePlan.weeklyTarget}× / week · {activePlan.exercises.length} exercise
                {activePlan.exercises.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Badge variant="default">
              <Text>Active</Text>
            </Badge>
          </View>

          <View className="gap-2 rounded-xl bg-muted/50 px-3 py-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-[13px] font-medium text-muted-foreground">This week</Text>
              <Text
                className="text-[13px] font-bold text-foreground"
                style={{ fontVariant: ['tabular-nums'] }}>
                {completed} / {target || activePlan.weeklyTarget} workouts
              </Text>
            </View>
            <Progress value={progressValue} className="h-2" />
          </View>

          <Button variant="outline" onPress={() => router.push('/(tabs)/(train)')}>
            <Text>Open Train</Text>
          </Button>
        </Surface>
      ) : (
        <Surface>
          <EmptyState
            icon={ClipboardListIcon}
            title="No active plan"
            description="Pick a starter template or build your own from scratch."
          />
          <View className="flex-row gap-3">
            {featuredTemplate ? (
              <Button
                variant="default"
                className="flex-1"
                onPress={() => createPlanFromTemplate(featuredTemplate.id)}
                disabled={isStartingPlanSetup}>
                {isStartingPlanSetup ? <ActivityIndicator size="small" color="white" /> : null}
                <Text>Use {featuredTemplate.name}</Text>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="flex-1"
              onPress={createEmptyPlan}
              disabled={isStartingPlanSetup}>
              <Text>Empty plan</Text>
            </Button>
          </View>
        </Surface>
      )}

      {activePlan ? (
        <>
          <SectionHeader title="Weekly Schedule" description="Your plan at a glance." />
          <Surface>
            <View className="flex-row gap-2">
              {activePlanDayGroups.map((day) => {
                const hasExercises = day.entries.length > 0;
                return (
                  <View
                    key={day.value}
                    className={
                      'flex-1 items-center gap-1 rounded-xl px-2 py-2 ' +
                      (hasExercises ? 'bg-primary/10' : 'bg-muted/40')
                    }
                    style={{ borderCurve: 'continuous' }}>
                    <Text
                      className={
                        hasExercises
                          ? 'text-[11px] font-bold text-primary'
                          : 'text-[11px] font-medium text-muted-foreground'
                      }>
                      {day.label}
                    </Text>
                    <Text
                      className="text-[13px] font-black text-foreground"
                      style={{ fontVariant: ['tabular-nums'] }}>
                      {day.entries.length}
                    </Text>
                  </View>
                );
              })}
            </View>

            {activePlanDayGroups
              .filter((day) => day.entries.length > 0)
              .map((day) => (
                <View
                  key={day.value}
                  className="gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
                  <View className="flex-row items-center gap-2">
                    <Icon as={CalendarDaysIcon} size={14} className="text-muted-foreground" />
                    <Text className="text-[13px] font-semibold text-foreground">{day.label}</Text>
                    <Badge variant="outline">
                      <Text>{day.entries.length}</Text>
                    </Badge>
                  </View>
                  {day.entries.map((entry) => (
                    <View key={entry.id} className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-[13px] text-foreground" numberOfLines={1}>
                        {entry.exercise.name}
                      </Text>
                      <Text
                        className="text-[12px] text-muted-foreground"
                        style={{ fontVariant: ['tabular-nums'] }}>
                        {entry.targetSets} x {entry.targetReps}
                        {typeof entry.targetWeight === 'number' ? ` · ${entry.targetWeight}kg` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
          </Surface>
        </>
      ) : null}

      {/* Plan editor */}
      {activePlan ? (
        <>
          <SectionHeader
            title="Plan Builder"
            description="Adjust the plan name, target, and exercise schedule."
          />
          <Surface>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Icon as={ClipboardListIcon} size={20} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">Plan setup</Text>
                <Text className="text-[13px] text-muted-foreground">
                  {editorExerciseCount} exercise{editorExerciseCount === 1 ? '' : 's'} across{' '}
                  {editorDayCount} day
                  {editorDayCount === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <View className="gap-1.5">
              <Label nativeID="plan-name">Plan name</Label>
              <Input
                aria-labelledby="plan-name"
                value={planEditorName}
                onChangeText={setPlanEditorName}
                placeholder="My personalized plan"
              />
            </View>
            <View className="gap-1.5">
              <Label>Weekly target</Label>
              <OptionChips
                layout="scroll"
                size="sm"
                items={WEEKLY_TARGET_OPTIONS}
                value={planEditorWeeklyTarget}
                onValueChange={setPlanEditorWeeklyTarget}
              />
            </View>

            <View className="gap-1.5">
              <Label>Add exercise</Label>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <OptionChips
                    layout="scroll"
                    size="sm"
                    items={exerciseSelectOptions}
                    value={planEditorExerciseId}
                    onValueChange={setPlanEditorExerciseId}
                  />
                </View>
              </View>
              <Button
                variant="outline"
                onPress={addExerciseToPlanEditor}
                disabled={exerciseSelectOptions.length === 0}>
                <Icon as={PlusIcon} size={16} className="text-foreground" />
                <Text>Add to plan</Text>
              </Button>
            </View>

            <View className="gap-2">
              <Label>Edit day</Label>
              <OptionChips
                layout="scroll"
                size="sm"
                items={DAY_OPTIONS}
                value={selectedEditorDay}
                onValueChange={setSelectedEditorDay}
              />
            </View>

            {selectedEditorDayEntries.length === 0 ? (
              <View className="rounded-xl bg-muted/50 px-3 py-4">
                <Text className="text-center text-[13px] text-muted-foreground">
                  No exercises scheduled for {getDayLabel(Number(selectedEditorDay))}.
                </Text>
              </View>
            ) : (
              selectedEditorDayEntries.map((entry) => {
                const exercise = exercises.find((item) => item.id === entry.exerciseId);
                return (
                  <View
                    key={entry.key}
                    className="gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-[15px] font-semibold text-foreground"
                          numberOfLines={1}>
                          {exercise?.name || 'Unknown exercise'}
                        </Text>
                        <Text className="text-[12px] text-muted-foreground">
                          {getDayLabel(entry.dayOfWeek)}
                        </Text>
                      </View>
                      <Button
                        variant="ghost"
                        size="icon"
                        onPress={() => {
                          Alert.alert(
                            'Remove exercise?',
                            `Remove "${exercise?.name || 'this exercise'}" from your plan?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => removePlanEditorExercise(entry.key),
                              },
                            ]
                          );
                        }}>
                        <Icon as={TrashIcon} size={16} className="text-destructive" />
                      </Button>
                    </View>

                    <View className="gap-1.5">
                      <Label>Move to day</Label>
                      <OptionChips
                        layout="scroll"
                        size="sm"
                        items={DAY_OPTIONS}
                        value={String(entry.dayOfWeek)}
                        onValueChange={(value) => {
                          updatePlanEditorExercise(entry.key, { dayOfWeek: Number(value) });
                          setSelectedEditorDay(value);
                        }}
                      />
                    </View>

                    <View className="flex-row gap-3">
                      <View className="flex-1 gap-1.5">
                        <Label>Sets</Label>
                        <Input
                          value={entry.targetSets}
                          onChangeText={(value) =>
                            updatePlanEditorExercise(entry.key, { targetSets: value })
                          }
                          keyboardType="numeric"
                        />
                      </View>
                      <View className="flex-1 gap-1.5">
                        <Label>Reps</Label>
                        <Input
                          value={entry.targetReps}
                          onChangeText={(value) =>
                            updatePlanEditorExercise(entry.key, { targetReps: value })
                          }
                          keyboardType="numeric"
                        />
                      </View>
                      <View className="flex-1 gap-1.5">
                        <Label>kg</Label>
                        <Input
                          value={entry.targetWeight}
                          onChangeText={(value) =>
                            updatePlanEditorExercise(entry.key, { targetWeight: value })
                          }
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <Button onPress={savePlanChanges} disabled={isSavingPlan} size="lg">
              {isSavingPlan ? <ActivityIndicator size="small" color="white" /> : null}
              <Icon as={SaveIcon} size={16} className="text-primary-foreground" />
              <Text>{isSavingPlan ? 'Saving…' : 'Save plan'}</Text>
            </Button>
          </Surface>
        </>
      ) : null}

      {/* Templates */}
      {templates.length > 0 ? (
        <>
          <SectionHeader
            title="Templates"
            description="Quick-start your plan with a curated routine."
          />
          {[featuredTemplate, ...additionalTemplates].filter(Boolean).map((template) => (
            <Surface key={template!.id}>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon as={SparklesIcon} size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-semibold text-foreground">
                    {template!.name}
                  </Text>
                  <Text className="text-[13px] text-muted-foreground" numberOfLines={2}>
                    {template!.description || `${template!.weeklyTarget}× / week`}
                  </Text>
                </View>
                <Badge variant="outline">
                  <Text>{template!.weeklyTarget}/wk</Text>
                </Badge>
              </View>
              <Button
                variant="outline"
                onPress={() => createPlanFromTemplate(template!.id)}
                disabled={isStartingPlanSetup}>
                <Text>Use this template</Text>
              </Button>
            </Surface>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
