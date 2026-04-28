import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { OptionChips } from '@/components/ui/option-chips';
import { Progress } from '@/components/ui/progress';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import {
    MEAL_TYPE_OPTIONS,
    MealType,
    useFoodTrackingData,
} from '@/lib/workouts/use-food-tracking';
import {
    BarcodeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FlameIcon,
    PlusIcon,
    SaladIcon,
    SearchIcon,
    Trash2Icon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

function shiftDate(iso: string, deltaDays: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function FoodScreen() {
  const {
    logDate,
    goals,
    logs,
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
    feedback,
    errorMessage,
    loadData,
    updateDate,
    saveGoals,
    addFoodLog,
    removeFoodLog,
    searchCatalog,
    lookupBarcode,
    applyMealTemplate,
  } = useFoodTrackingData();

  const [calTarget, setCalTarget] = useState(String(goals?.caloriesTarget ?? 2200));
  const [proteinTarget, setProteinTarget] = useState(String(goals?.proteinTarget ?? 150));
  const [carbsTarget, setCarbsTarget] = useState(String(goals?.carbsTarget ?? 250));
  const [fatTarget, setFatTarget] = useState(String(goals?.fatTarget ?? 70));

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [barcode, setBarcode] = useState('');

  const totals = summary?.totals;
  const goalsActive = !!goals;

  const macros = useMemo(
    () => [
      {
        label: 'Calories',
        value: Math.round(totals?.calories ?? 0),
        target: goals?.caloriesTarget ?? 0,
        unit: 'kcal',
      },
      {
        label: 'Protein',
        value: Math.round(totals?.proteinGrams ?? 0),
        target: goals?.proteinTarget ?? 0,
        unit: 'g',
      },
      {
        label: 'Carbs',
        value: Math.round(totals?.carbsGrams ?? 0),
        target: goals?.carbsTarget ?? 0,
        unit: 'g',
      },
      {
        label: 'Fat',
        value: Math.round(totals?.fatGrams ?? 0),
        target: goals?.fatTarget ?? 0,
        unit: 'g',
      },
    ],
    [totals, goals]
  );

  const handleAddLog = async () => {
    const payload = {
      foodName: foodName.trim(),
      mealType,
      quantity: Number(quantity) || 1,
      calories: Number(calories) || 0,
      proteinGrams: Number(protein) || 0,
      carbsGrams: Number(carbs) || 0,
      fatGrams: Number(fat) || 0,
    };
    if (!payload.foodName) return;
    await addFoodLog(payload);
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  return (
    <Screen refreshing={isLoading} onRefresh={() => loadData()} contentContainerStyle={{ paddingTop: 8 }}>
      {/* Date nav */}
      <Surface>
        <View className="flex-row items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => updateDate(shiftDate(logDate, -1))}
          >
            <Icon as={ChevronLeftIcon} size={20} className="text-foreground" />
          </Button>
          <View className="items-center">
            <Text className="text-[16px] font-semibold text-foreground">{formatDate(logDate)}</Text>
            {logDate !== todayIso() ? (
              <Button variant="ghost" size="sm" onPress={() => updateDate(todayIso())}>
                <Text className="text-primary">Jump to today</Text>
              </Button>
            ) : (
              <Text className="text-[12px] text-muted-foreground">Today</Text>
            )}
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => updateDate(shiftDate(logDate, 1))}
            disabled={logDate >= todayIso()}
          >
            <Icon as={ChevronRightIcon} size={20} className="text-foreground" />
          </Button>
        </View>
      </Surface>

      {/* Goals onboarding */}
      {!goalsActive ? (
        <Surface>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Icon as={FlameIcon} size={22} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-foreground">Set your nutrition goals</Text>
              <Text className="text-[13px] text-muted-foreground">
                Daily targets unlock macro tracking and adherence scoring.
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Label>Calories</Label>
              <Input value={calTarget} onChangeText={setCalTarget} keyboardType="numeric" />
            </View>
            <View className="flex-1 gap-1.5">
              <Label>Protein (g)</Label>
              <Input value={proteinTarget} onChangeText={setProteinTarget} keyboardType="numeric" />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Label>Carbs (g)</Label>
              <Input value={carbsTarget} onChangeText={setCarbsTarget} keyboardType="numeric" />
            </View>
            <View className="flex-1 gap-1.5">
              <Label>Fat (g)</Label>
              <Input value={fatTarget} onChangeText={setFatTarget} keyboardType="numeric" />
            </View>
          </View>
          <Button
            onPress={() =>
              saveGoals({
                caloriesTarget: Number(calTarget) || 2200,
                proteinTarget: Number(proteinTarget) || 150,
                carbsTarget: Number(carbsTarget) || 250,
                fatTarget: Number(fatTarget) || 70,
              })
            }
            disabled={isSavingGoals}
          >
            {isSavingGoals ? <ActivityIndicator size="small" color="white" /> : null}
            <Text>{isSavingGoals ? 'Saving…' : 'Save goals'}</Text>
          </Button>
        </Surface>
      ) : (
        <>
          <SectionHeader title="Today's Macros" />
          <View className="flex-row gap-3">
            <StatTile
              label="Calories"
              value={Math.round(totals?.calories ?? 0)}
              unit={`/ ${goals.caloriesTarget}`}
              icon={FlameIcon}
              tone="warning"
            />
            <StatTile
              label="Protein"
              value={Math.round(totals?.proteinGrams ?? 0)}
              unit={`/ ${goals.proteinTarget}g`}
              icon={SaladIcon}
              tone="primary"
            />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Carbs"
              value={Math.round(totals?.carbsGrams ?? 0)}
              unit={`/ ${goals.carbsTarget}g`}
            />
            <StatTile
              label="Fat"
              value={Math.round(totals?.fatGrams ?? 0)}
              unit={`/ ${goals.fatTarget}g`}
            />
          </View>

          <Surface>
            {macros.map((macro) => {
              const pct = macro.target > 0 ? Math.min(100, (macro.value / macro.target) * 100) : 0;
              return (
                <View key={macro.label} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] text-muted-foreground">{macro.label}</Text>
                    <Text className="text-[13px] text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
                      {macro.value} / {macro.target} {macro.unit}
                    </Text>
                  </View>
                  <Progress value={pct} className="h-2" />
                </View>
              );
            })}
            {summary?.adherence ? (
              <View className="flex-row items-center justify-between pt-2 border-t-hairline border-separator">
                <Text className="text-[13px] text-muted-foreground">Adherence score</Text>
                <Badge variant={summary.adherence.score >= 80 ? 'default' : 'secondary'}>
                  <Text>{Math.round(summary.adherence.score)}%</Text>
                </Badge>
              </View>
            ) : null}
          </Surface>
        </>
      )}

      {/* Today's logs */}
      <SectionHeader
        title="Logged Meals"
        description={
          logs.length === 0 ? 'Quick-add a meal below or apply a template.' : `${logs.length} item${logs.length === 1 ? '' : 's'}`
        }
      />
      {logs.length > 0 ? (
        <ListGroup>
          {logs.map((log) => (
            <ListRow
              key={log.id}
              icon={SaladIcon}
              title={log.foodName}
              subtitle={`${log.mealType} · ${log.quantity}× · ${Math.round(log.calories)} kcal · P${Math.round(
                log.proteinGrams
              )} C${Math.round(log.carbsGrams)} F${Math.round(log.fatGrams)}`}
              trailing={
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => removeFoodLog(log.id)}
                >
                  <Icon as={Trash2Icon} size={16} className="text-destructive" />
                </Button>
              }
              showChevron={false}
            />
          ))}
        </ListGroup>
      ) : (
        <Surface>
          <EmptyState
            compact
            icon={SaladIcon}
            title="Nothing logged"
            description="Track your first meal of the day below."
          />
        </Surface>
      )}

      {/* Quick add */}
      <SectionHeader title="Quick Add" />
      <Surface>
        <View className="gap-1.5">
          <Label>Meal type</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={MEAL_TYPE_OPTIONS}
            value={mealType}
            onValueChange={(value) => setMealType(value as MealType)}
          />
        </View>
        <View className="gap-1.5">
          <Label>Food name</Label>
          <Input value={foodName} onChangeText={setFoodName} placeholder="e.g. Greek yogurt" />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>Quantity</Label>
            <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Calories</Label>
            <Input value={calories} onChangeText={setCalories} keyboardType="numeric" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>Protein (g)</Label>
            <Input value={protein} onChangeText={setProtein} keyboardType="numeric" />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Carbs (g)</Label>
            <Input value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Fat (g)</Label>
            <Input value={fat} onChangeText={setFat} keyboardType="numeric" />
          </View>
        </View>
        <Button onPress={handleAddLog} disabled={isSavingLog || !foodName.trim()}>
          {isSavingLog ? <ActivityIndicator size="small" color="white" /> : null}
          <Icon as={PlusIcon} size={16} className="text-primary-foreground" />
          <Text>{isSavingLog ? 'Saving…' : 'Log meal'}</Text>
        </Button>
      </Surface>

      {/* Search catalog */}
      <SectionHeader title="Search Catalog" />
      <Surface>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search foods…"
              returnKeyType="search"
              onSubmitEditing={() => searchQuery.trim() && searchCatalog(searchQuery.trim())}
            />
          </View>
          <Button
            variant="outline"
            size="icon"
            onPress={() => searchQuery.trim() && searchCatalog(searchQuery.trim())}
            disabled={isSearchingCatalog || !searchQuery.trim()}
          >
            {isSearchingCatalog ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon as={SearchIcon} size={18} className="text-foreground" />
            )}
          </Button>
        </View>
      </Surface>
      {catalogResults.length > 0 ? (
        <ListGroup>
          {catalogResults.slice(0, 8).map((food) => (
            <ListRow
              key={food.id}
              title={food.name}
              subtitle={`${food.brand ? `${food.brand} · ` : ''}${food.servingLabel} · ${Math.round(food.calories)} kcal`}
              onPress={() => {
                setFoodName(food.name);
                setCalories(String(Math.round(food.calories)));
                setProtein(String(Math.round(food.proteinGrams)));
                setCarbs(String(Math.round(food.carbsGrams)));
                setFat(String(Math.round(food.fatGrams)));
              }}
            />
          ))}
        </ListGroup>
      ) : null}

      {/* Barcode */}
      <SectionHeader title="Barcode Lookup" />
      <Surface>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Enter barcode digits"
              keyboardType="numeric"
            />
          </View>
          <Button
            variant="outline"
            size="icon"
            onPress={() => barcode.trim() && lookupBarcode(barcode.trim())}
            disabled={isLookingUpBarcode || !barcode.trim()}
          >
            {isLookingUpBarcode ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon as={BarcodeIcon} size={18} className="text-foreground" />
            )}
          </Button>
        </View>
        {barcodeResult ? (
          <View className="gap-2 pt-2 border-t-hairline border-separator">
            <Text className="text-[15px] font-semibold text-foreground">
              {barcodeResult.food.name}
            </Text>
            <Text className="text-[13px] text-muted-foreground">
              {barcodeResult.food.brand ? `${barcodeResult.food.brand} · ` : ''}
              {barcodeResult.food.servingLabel} · {Math.round(barcodeResult.food.calories)} kcal · P
              {Math.round(barcodeResult.food.proteinGrams)} C{Math.round(barcodeResult.food.carbsGrams)} F
              {Math.round(barcodeResult.food.fatGrams)}
            </Text>
            <Button
              variant="outline"
              onPress={() => {
                setFoodName(barcodeResult.food.name);
                setCalories(String(Math.round(barcodeResult.food.calories)));
                setProtein(String(Math.round(barcodeResult.food.proteinGrams)));
                setCarbs(String(Math.round(barcodeResult.food.carbsGrams)));
                setFat(String(Math.round(barcodeResult.food.fatGrams)));
              }}
            >
              <Text>Use in quick add</Text>
            </Button>
          </View>
        ) : null}
      </Surface>

      {/* Templates */}
      {mealTemplates.length > 0 ? (
        <>
          <SectionHeader title="Meal Templates" />
          <ListGroup>
            {mealTemplates.map((template) => (
              <ListRow
                key={template.id}
                title={template.name}
                subtitle={`${template.items.length} item${template.items.length === 1 ? '' : 's'}${
                  template.mealType ? ` · ${template.mealType}` : ''
                }`}
                onPress={() => applyMealTemplate(template.id)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {/* Trend */}
      {trendPoints.length > 0 ? (
        <>
          <SectionHeader title="7-Day Trend" />
          <ListGroup>
            {trendPoints.slice(-7).map((point) => (
              <ListRow
                key={point.logDate}
                title={formatDate(point.logDate)}
                subtitle={`${Math.round(point.calories)} kcal · ${
                  point.adherenceScore !== null
                    ? `${Math.round(point.adherenceScore)}% adherence`
                    : '—'
                }`}
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
