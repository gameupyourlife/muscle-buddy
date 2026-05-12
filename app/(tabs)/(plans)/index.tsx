import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionChips } from '@/components/ui/option-chips';
import { Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
    DAY_OPTIONS,
    WEEKLY_TARGET_OPTIONS,
    useWorkoutsData,
} from '@/lib/workouts/use-workouts';
import { useRouter } from 'expo-router';
import {
    ClipboardListIcon,
    PlusIcon,
    SparklesIcon,
    TrashIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

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
  } = useWorkoutsData();

  const featuredTemplate = useMemo(() => templates[0] ?? null, [templates]);
  const additionalTemplates = useMemo(() => templates.slice(1), [templates]);

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {/* Active plan card */}
      {activePlan ? (
        <Surface>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
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
          <Button
            variant="outline"
            onPress={() => router.push('/(tabs)/(train)')}
          >
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
                disabled={isStartingPlanSetup}
              >
                {isStartingPlanSetup ? <ActivityIndicator size="small" color="white" /> : null}
                <Text>Use {featuredTemplate.name}</Text>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="flex-1"
              onPress={createEmptyPlan}
              disabled={isStartingPlanSetup}
            >
              <Text>Empty plan</Text>
            </Button>
          </View>
        </Surface>
      )}

      {/* Plan editor */}
      {activePlan ? (
        <>
          <SectionHeader title="Plan Details" />
          <Surface>
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
          </Surface>

          <SectionHeader
            title="Exercises"
            description={
              planEditorExercises.length === 0
                ? 'Add at least one exercise to personalize your plan.'
                : `${planEditorExercises.length} exercise${planEditorExercises.length === 1 ? '' : 's'} configured`
            }
          />

          <Surface>
            <View className="gap-1.5">
              <Label>Add exercise</Label>
              <OptionChips
                layout="scroll"
                size="sm"
                items={exerciseSelectOptions}
                value={planEditorExerciseId}
                onValueChange={setPlanEditorExerciseId}
              />
              <Button
                variant="outline"
                onPress={addExerciseToPlanEditor}
                disabled={exerciseSelectOptions.length === 0}
              >
                <Icon as={PlusIcon} size={16} className="text-foreground" />
                <Text>Add to plan</Text>
              </Button>
            </View>
          </Surface>

          {planEditorExercises.map((entry) => {
            const exercise = exercises.find((item) => item.id === entry.exerciseId);
            return (
              <Surface key={entry.key}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-[16px] font-semibold text-foreground">
                    {exercise?.name || 'Unknown exercise'}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
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
                        ],
                      );
                    }}
                  >
                    <Icon as={TrashIcon} size={14} className="text-destructive" />
                    <Text className="text-destructive">Remove</Text>
                  </Button>
                </View>

                <View className="gap-1.5">
                  <Label>Day</Label>
                  <OptionChips
                    layout="scroll"
                    size="sm"
                    items={DAY_OPTIONS}
                    value={String(entry.dayOfWeek)}
                    onValueChange={(value) =>
                      updatePlanEditorExercise(entry.key, { dayOfWeek: Number(value) })
                    }
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
              </Surface>
            );
          })}

          <Button onPress={savePlanChanges} disabled={isSavingPlan} size="lg">
            {isSavingPlan ? <ActivityIndicator size="small" color="white" /> : null}
            <Text>{isSavingPlan ? 'Saving…' : 'Save changes'}</Text>
          </Button>
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
                disabled={isStartingPlanSetup}
              >
                <Text>Use this template</Text>
              </Button>
            </Surface>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
