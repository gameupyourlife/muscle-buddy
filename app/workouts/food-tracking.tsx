import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionChips } from '@/components/ui/option-chips';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { MEAL_TYPE_OPTIONS, type MealType, useFoodTrackingData } from '@/lib/workouts/use-food-tracking';
import { Stack } from 'expo-router';
import { SearchIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftIsoDate(isoDate: string, days: number) {
  const parsed = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  parsed.setDate(parsed.getDate() + days);
  return toIsoDate(parsed);
}

export default function FoodTrackingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    logDate,
    goals,
    logs,
    recentFoods,
    summary,
    trendPoints,
    catalogResults,
    barcodeResult,
    mealTemplates,
    isLoading,
    isSavingGoals,
    isSavingLog,
    isSearchingCatalog,
    isLookingUpBarcode,
    isWorkingWithTemplates,
    feedback,
    errorMessage,
    updateDate,
    saveGoals,
    addFoodLog,
    removeFoodLog,
    searchCatalog,
    lookupBarcode,
    createMealTemplate,
    applyMealTemplate,
    setBarcodeResult,
  } = useFoodTrackingData();

  const [goalsCalories, setGoalsCalories] = useState('2300');
  const [goalsProtein, setGoalsProtein] = useState('170');
  const [goalsCarbs, setGoalsCarbs] = useState('240');
  const [goalsFat, setGoalsFat] = useState('70');
  const [logDateInput, setLogDateInput] = useState(logDate);

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'library'>('today');

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('0');
  const [proteinGrams, setProteinGrams] = useState('0');
  const [carbsGrams, setCarbsGrams] = useState('0');
  const [fatGrams, setFatGrams] = useState('0');
  const [notes, setNotes] = useState('');

  const isCompact = width < 390;
  const contentPaddingTop = Math.max(12, insets.top + 4);
  const contentPaddingBottom = Math.max(28, insets.bottom + 20);

  const isToday = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return logDate === today;
  }, [logDate]);

  const reminderMessages = useMemo(() => {
    if (!summary?.goals || !isToday) {
      return [] as string[];
    }

    const nowHour = new Date().getHours();
    const messages: string[] = [];

    if (nowHour >= 12 && logs.length === 0) {
      messages.push('No meals logged yet today. Add your first entry to stay on pace.');
    }

    if (nowHour >= 18 && summary.totals.proteinGrams < Math.round(summary.goals.proteinTarget * 0.7)) {
      messages.push('Protein intake is below evening pace. Consider a high-protein meal.');
    }

    if (nowHour >= 21 && logs.length === 0) {
      messages.push('Daily logging is still empty tonight. Add meals before day-end.');
    }

    return messages;
  }, [isToday, logs.length, summary]);

  useEffect(() => {
    if (goals) {
      setGoalsCalories(String(goals.caloriesTarget));
      setGoalsProtein(String(goals.proteinTarget));
      setGoalsCarbs(String(goals.carbsTarget));
      setGoalsFat(String(goals.fatTarget));
    }
  }, [goals]);

  useEffect(() => {
    setLogDateInput(logDate);
  }, [logDate]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      return;
    }

    const handle = setTimeout(() => {
      void searchCatalog(trimmed, 1, 20);
    }, 280);

    return () => {
      clearTimeout(handle);
    };
  }, [searchCatalog, searchQuery]);

  const applyFoodSuggestion = (entry: {
    foodName: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  }) => {
    setFoodName(entry.foodName);
    setCalories(String(entry.calories));
    setProteinGrams(String(entry.proteinGrams));
    setCarbsGrams(String(entry.carbsGrams));
    setFatGrams(String(entry.fatGrams));
  };

  const submitGoals = async () => {
    await saveGoals({
      caloriesTarget: Number(goalsCalories),
      proteinTarget: Number(goalsProtein),
      carbsTarget: Number(goalsCarbs),
      fatTarget: Number(goalsFat),
    });
  };

  const submitFoodLog = async () => {
    await addFoodLog({
      foodName: foodName.trim(),
      mealType,
      quantity: Number(quantity),
      calories: Number(calories),
      proteinGrams: Number(proteinGrams),
      carbsGrams: Number(carbsGrams),
      fatGrams: Number(fatGrams),
      notes: notes.trim() || null,
    });
  };

  const submitTemplate = async () => {
    if (!templateName.trim() || !foodName.trim()) {
      return;
    }

    await createMealTemplate({
      name: templateName.trim(),
      mealType,
      items: [
        {
          foodName: foodName.trim(),
          quantity: Number(quantity),
          calories: Number(calories),
          proteinGrams: Number(proteinGrams),
          carbsGrams: Number(carbsGrams),
          fatGrams: Number(fatGrams),
        },
      ],
    });
  };

  const handleBarcodeLookup = async () => {
    const result = await lookupBarcode(barcodeInput);

    if (!result) {
      return;
    }

    const resolved = result.food;
    applyFoodSuggestion({
      foodName: resolved.name,
      calories: resolved.calories,
      proteinGrams: resolved.proteinGrams,
      carbsGrams: resolved.carbsGrams,
      fatGrams: resolved.fatGrams,
    });
  };

  const changeDateByOffset = async (days: number) => {
    const nextDate = shiftIsoDate(logDate, days);
    setLogDateInput(nextDate);
    await updateDate(nextDate);
  };

  const setTodayDate = async () => {
    const today = toIsoDate(new Date());
    setLogDateInput(today);
    await updateDate(today);
  };

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
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-[13px] font-semibold uppercase text-[#8e8e93]">Nutrition Companion</Text>
          <Badge variant="outline">
            <Text>{logDate}</Text>
          </Badge>
        </View>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Label nativeID="log-date" className="text-white">Selected day</Label>
            {isLoading ? <ActivityIndicator size="small" color="white" /> : null}
          </View>
          <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
            <Button className="flex-1" variant="outline" onPress={() => void changeDateByOffset(-1)}>
              <Text>Previous day</Text>
            </Button>
            <Button className="flex-1" variant={isToday ? 'secondary' : 'outline'} onPress={() => void setTodayDate()}>
              <Text>Today</Text>
            </Button>
            <Button className="flex-1" variant="outline" onPress={() => void changeDateByOffset(1)}>
              <Text>Next day</Text>
            </Button>
          </View>
          <Input
            aria-labelledby="log-date"
            value={logDateInput}
            onChangeText={setLogDateInput}
            placeholder="YYYY-MM-DD"
          />
          <Button
            variant="outline"
            onPress={() => void updateDate(logDateInput)}
            disabled={logDateInput.length !== 10 || logDateInput === logDate}
          >
            <Text>Apply date</Text>
          </Button>
        </Card>

        {!goals ? (
          <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
            <Text className="text-white font-semibold">Set your daily targets first</Text>
            <Text className="text-xs text-muted-foreground" selectable>
              Onboarding is required before first meal log.
            </Text>

            <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
              <View className="flex-1 gap-2">
                <Label>Calories</Label>
                <Input value={goalsCalories} onChangeText={setGoalsCalories} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-2">
                <Label>Protein (g)</Label>
                <Input value={goalsProtein} onChangeText={setGoalsProtein} keyboardType="numeric" />
              </View>
            </View>

            <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
              <View className="flex-1 gap-2">
                <Label>Carbs (g)</Label>
                <Input value={goalsCarbs} onChangeText={setGoalsCarbs} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-2">
                <Label>Fat (g)</Label>
                <Input value={goalsFat} onChangeText={setGoalsFat} keyboardType="numeric" />
              </View>
            </View>

            <Button onPress={submitGoals} disabled={isSavingGoals}>
              {isSavingGoals ? <ActivityIndicator size="small" color="white" /> : null}
              <Text className="text-white">Save goals</Text>
            </Button>
          </Card>
        ) : (
          <>
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Focus area</Text>
              <Text className="text-xs text-muted-foreground" selectable>
                Use Today for logging and progress. Use Library to search foods, reuse templates, and review trends.
              </Text>
              <OptionChips
                items={[
                  { value: 'today', label: 'Today' },
                  { value: 'library', label: 'Library' },
                ]}
                value={viewMode}
                onValueChange={(value) => setViewMode((value as 'today' | 'library') ?? 'today')}
              />
            </Card>

            {viewMode === 'today' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-semibold">Today summary</Text>
                <Badge variant="secondary">
                  <Text>{summary?.nutritionXpAwarded ?? 0} XP</Text>
                </Badge>
              </View>

              <View className="gap-2 rounded-xl border border-[#38383a] bg-black/20 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Protein</Text>
                  <Text className="text-xs text-white" selectable>
                    {summary?.totals.proteinGrams ?? 0}g / {goals.proteinTarget}g
                  </Text>
                </View>
                <Progress
                  value={clampPercent((summary?.totals.proteinGrams ?? 0) / Math.max(1, goals.proteinTarget))}
                  className="h-2"
                />
              </View>

              <View className="gap-2 rounded-xl border border-[#38383a] bg-black/20 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Adherence score</Text>
                  <Text className="text-xs text-white" selectable>
                    {Math.round((summary?.adherence?.score ?? 0) * 100)}%
                  </Text>
                </View>
                <Progress value={clampPercent(summary?.adherence?.score ?? 0)} className="h-2" />
              </View>

              <Text className="text-xs text-muted-foreground" selectable>
                Calories: {summary?.totals.calories ?? 0} / {goals.caloriesTarget} kcal | Carbs: {summary?.totals.carbsGrams ?? 0}g | Fat: {summary?.totals.fatGrams ?? 0}g
              </Text>
            </Card>
            ) : null}

            {viewMode === 'today'
              ? reminderMessages.map((message) => (
              <View key={message} className="rounded-xl border border-[#1e3a8a]/40 bg-[#1e3a8a]/20 p-3">
                <Text className="text-blue-300 text-sm" selectable>
                  {message}
                </Text>
              </View>
                ))
              : null}

            {viewMode === 'today' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Quick add meal</Text>

              <View className="gap-2">
                <Label nativeID="food-name">Food name</Label>
                <Input aria-labelledby="food-name" value={foodName} onChangeText={setFoodName} placeholder="e.g. Chicken bowl" />
              </View>

              <View className="gap-2">
                <Label nativeID="meal-type">Meal type</Label>
                <OptionChips
                  layout="scroll"
                  items={MEAL_TYPE_OPTIONS}
                  value={mealType}
                  onValueChange={(value) => setMealType((value as MealType) ?? 'breakfast')}
                />
              </View>

              <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                <View className="flex-1 gap-2">
                  <Label>Quantity</Label>
                  <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Calories</Label>
                  <Input value={calories} onChangeText={setCalories} keyboardType="numeric" />
                </View>
              </View>

              <View className="gap-2" style={{ flexDirection: isCompact ? 'column' : 'row' }}>
                <View className="flex-1 gap-2">
                  <Label>Protein</Label>
                  <Input value={proteinGrams} onChangeText={setProteinGrams} keyboardType="numeric" />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Carbs</Label>
                  <Input value={carbsGrams} onChangeText={setCarbsGrams} keyboardType="numeric" />
                </View>
                <View className="flex-1 gap-2">
                  <Label>Fat</Label>
                  <Input value={fatGrams} onChangeText={setFatGrams} keyboardType="numeric" />
                </View>
              </View>

              <View className="gap-2">
                <Label>Notes</Label>
                <Input value={notes} onChangeText={setNotes} placeholder="Optional" />
              </View>

              <Button onPress={submitFoodLog} disabled={isSavingLog || !foodName.trim()}>
                {isSavingLog ? <ActivityIndicator size="small" color="white" /> : null}
                <Text className="text-white">Log meal</Text>
              </Button>

              <View className="gap-2 rounded-xl border border-[#38383a] bg-black/20 p-3">
                <Label>Save as template</Label>
                <Input value={templateName} onChangeText={setTemplateName} placeholder="Template name" />
                <Button
                  variant="outline"
                  onPress={submitTemplate}
                  disabled={isWorkingWithTemplates || !templateName.trim() || !foodName.trim()}
                >
                  {isWorkingWithTemplates ? <ActivityIndicator size="small" color="black" /> : null}
                  <Text>Create template from current draft</Text>
                </Button>
              </View>
            </Card>
            ) : null}

            {viewMode === 'library' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Search or scan</Text>
              <View className="gap-2">
                <Label>Food search</Label>
                <Input value={searchQuery} onChangeText={setSearchQuery} placeholder="Search catalog" />
                {isSearchingCatalog ? <ActivityIndicator size="small" color="white" /> : null}
              </View>

              {catalogResults.slice(0, 5).map((entry) => (
                <View key={entry.id} className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-2">
                  <Text className="text-sm font-semibold text-white">{entry.name}</Text>
                  <Text className="text-xs text-muted-foreground" selectable>
                    {entry.calories} kcal | P {entry.proteinGrams}g | C {entry.carbsGrams}g | F {entry.fatGrams}g
                  </Text>
                  <Button variant="outline" onPress={() => applyFoodSuggestion({
                    foodName: entry.name,
                    calories: entry.calories,
                    proteinGrams: entry.proteinGrams,
                    carbsGrams: entry.carbsGrams,
                    fatGrams: entry.fatGrams,
                  })}>
                    <Text>Use values</Text>
                  </Button>
                </View>
              ))}

              <View className="gap-2">
                <Label>Barcode</Label>
                <Input value={barcodeInput} onChangeText={setBarcodeInput} placeholder="Enter barcode digits" />
                <Button variant="secondary" onPress={handleBarcodeLookup} disabled={isLookingUpBarcode || barcodeInput.trim().length < 6}>
                  {isLookingUpBarcode ? <ActivityIndicator size="small" color="black" /> : <SearchIcon size={16} color="black" />}
                  <Text>Lookup barcode</Text>
                </Button>
              </View>

              {barcodeResult ? (
                <View className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-2">
                  <Text className="text-sm font-semibold text-white">{barcodeResult.food.name}</Text>
                  <Text className="text-xs text-muted-foreground" selectable>
                    {barcodeResult.food.calories} kcal | P {barcodeResult.food.proteinGrams}g | C {barcodeResult.food.carbsGrams}g | F {barcodeResult.food.fatGrams}g
                  </Text>
                  <Button variant="outline" onPress={() => applyFoodSuggestion({
                    foodName: barcodeResult.food.name,
                    calories: barcodeResult.food.calories,
                    proteinGrams: barcodeResult.food.proteinGrams,
                    carbsGrams: barcodeResult.food.carbsGrams,
                    fatGrams: barcodeResult.food.fatGrams,
                  })}>
                    <Text>Use barcode result</Text>
                  </Button>
                  <Button variant="ghost" onPress={() => setBarcodeResult(null)}>
                    <Text>Dismiss</Text>
                  </Button>
                </View>
              ) : null}
            </Card>
            ) : null}

            {viewMode === 'library' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Recent foods</Text>
              {recentFoods.length === 0 ? (
                <Text className="text-xs text-muted-foreground" selectable>
                  No recent foods yet.
                </Text>
              ) : (
                recentFoods.map((entry) => (
                  <View key={`recent-${entry.id}`} className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-2">
                    <Text className="text-sm text-white">{entry.foodName}</Text>
                    <Text className="text-xs text-muted-foreground" selectable>
                      {entry.calories} kcal | P {entry.proteinGrams} | C {entry.carbsGrams} | F {entry.fatGrams}
                    </Text>
                    <Button variant="outline" onPress={() => applyFoodSuggestion({
                      foodName: entry.foodName,
                      calories: entry.calories,
                      proteinGrams: entry.proteinGrams,
                      carbsGrams: entry.carbsGrams,
                      fatGrams: entry.fatGrams,
                    })}>
                      <Text>Reuse</Text>
                    </Button>
                  </View>
                ))
              )}
            </Card>
            ) : null}

            {viewMode === 'library' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Meal templates</Text>
              {mealTemplates.length === 0 ? (
                <Text className="text-xs text-muted-foreground" selectable>
                  No templates yet. Save your current meal draft as a template.
                </Text>
              ) : (
                mealTemplates.map((template) => (
                  <View key={template.id} className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-white">{template.name}</Text>
                      {template.mealType ? (
                        <Badge variant="outline">
                          <Text>{template.mealType}</Text>
                        </Badge>
                      ) : null}
                    </View>
                    <Text className="text-xs text-muted-foreground" selectable>
                      {template.items.length} item(s)
                    </Text>
                    <Button
                      variant="outline"
                      onPress={() => void applyMealTemplate(template.id, mealType)}
                      disabled={isWorkingWithTemplates}
                    >
                      <Text>Apply to current day</Text>
                    </Button>
                  </View>
                ))
              )}
            </Card>
            ) : null}

            {viewMode === 'today' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">Today logs</Text>
              {logs.length === 0 ? (
                <Text className="text-xs text-muted-foreground" selectable>
                  No logs for this day.
                </Text>
              ) : (
                logs.map((entry) => (
                  <View key={entry.id} className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-white">{entry.foodName}</Text>
                      <Badge variant="outline">
                        <Text>{entry.mealType}</Text>
                      </Badge>
                    </View>
                    <Text className="text-xs text-muted-foreground" selectable>
                      {entry.calories} kcal | P {entry.proteinGrams}g | C {entry.carbsGrams}g | F {entry.fatGrams}g | Qty {entry.quantity}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground" selectable>
                      Last edited: {new Date(entry.lastEditedAt).toLocaleString()}
                    </Text>
                    <Button variant="destructive" onPress={() => void removeFoodLog(entry.id)} disabled={isSavingLog}>
                      <Text>Delete</Text>
                    </Button>
                  </View>
                ))
              )}
            </Card>
            ) : null}

            {viewMode === 'library' ? (
            <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
              <Text className="text-white font-semibold">7-day trend</Text>
              {trendPoints.map((point) => (
                <View key={point.logDate} className="rounded-xl border border-[#38383a] bg-black/20 p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-white">{point.logDate}</Text>
                    <Text className="text-xs text-muted-foreground" selectable>
                      {point.adherenceScore !== null ? `${Math.round(point.adherenceScore * 100)}% adherence` : 'No goals'}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground" selectable>
                    {point.calories} kcal | P {point.proteinGrams}g | C {point.carbsGrams}g | F {point.fatGrams}g
                  </Text>
                </View>
              ))}
            </Card>
            ) : null}
          </>
        )}

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

        <View className="h-3" />
      </ScrollView>
    </>
  );
}
