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
import { MEAL_TYPE_OPTIONS, MealType, useFoodTrackingData } from '@/lib/workouts/use-food-tracking';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import {
  BarcodeIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  PlusIcon,
  SaladIcon,
  Trash2Icon,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

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

const ADD_FOOD_MODE_OPTIONS = [
  { value: 'scan', label: 'Scan' },
  { value: 'manual', label: 'Manual' },
] as const;

export default function FoodScreen() {
  const {
    logDate,
    goals,
    logs,
    summary,
    trendPoints,
    barcodeResult,
    mealTemplates,
    isLoading,
    isSavingGoals,
    isSavingLog,
    isLookingUpBarcode,
    feedback,
    errorMessage,
    loadData,
    refreshNow,
    updateDate,
    saveGoals,
    addFoodLog,
    removeFoodLog,
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

  const [barcode, setBarcode] = useState('');
  const [addFoodMode, setAddFoodMode] = useState<'scan' | 'manual'>('scan');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeLookupNotice, setBarcodeLookupNotice] = useState<string | null>(null);
  const scanLockRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
  const trendSummary = useMemo(() => {
    const points = trendPoints.slice(-7);
    const maxCalories = Math.max(1, ...points.map((point) => Math.round(point.calories)));
    const averageCalories =
      points.length > 0
        ? Math.round(points.reduce((sum, point) => sum + point.calories, 0) / points.length)
        : 0;
    const scoredPoints = points.filter((point) => point.adherenceScore !== null);
    const averageAdherence =
      scoredPoints.length > 0
        ? Math.round(
            scoredPoints.reduce((sum, point) => sum + (point.adherenceScore ?? 0), 0) /
              scoredPoints.length
          )
        : null;

    return {
      points,
      maxCalories,
      averageCalories,
      averageAdherence,
    };
  }, [trendPoints]);

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

  const applyFoodToQuickAdd = (food: {
    name: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  }) => {
    setFoodName(food.name);
    setCalories(String(Math.round(food.calories)));
    setProtein(String(Math.round(food.proteinGrams)));
    setCarbs(String(Math.round(food.carbsGrams)));
    setFat(String(Math.round(food.fatGrams)));
  };

  const handleBarcodeLookup = async (nextBarcode: string) => {
    const cleanBarcode = nextBarcode.trim();

    if (!cleanBarcode) {
      return;
    }

    setBarcode(cleanBarcode);
    setBarcodeLookupNotice(null);
    const result = await lookupBarcode(cleanBarcode);

    if (!result) {
      setBarcodeLookupNotice('No nutrition data found for this barcode.');
      return;
    }

    setBarcodeLookupNotice(
      result.source === 'local'
        ? 'Found in your food catalog.'
        : 'Found via Open Food Facts. Review before logging.'
    );
  };

  const openBarcodeScanner = async () => {
    setBarcodeLookupNotice(null);

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        Alert.alert(
          'Camera access needed',
          'Allow camera access to scan food barcodes. You can still enter the barcode manually.'
        );
        return;
      }
    }

    scanLockRef.current = false;
    setIsScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const scannedValue = result.data?.trim();

    if (scanLockRef.current || !scannedValue) {
      return;
    }

    scanLockRef.current = true;
    setIsScannerOpen(false);
    void handleBarcodeLookup(scannedValue).finally(() => {
      scanLockRef.current = false;
    });
  };

  return (
    <Screen refreshing={isLoading} onRefresh={refreshNow} contentContainerStyle={{ paddingTop: 8 }}>
      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {/* Date nav */}
      <Surface>
        <View className="flex-row items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onPress={() => updateDate(shiftDate(logDate, -1))}>
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
            disabled={logDate >= todayIso()}>
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
              <Text className="text-[16px] font-semibold text-foreground">
                Set your nutrition goals
              </Text>
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
            disabled={isSavingGoals}>
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
                    <Text
                      className="text-[13px] text-foreground"
                      style={{ fontVariant: ['tabular-nums'] }}>
                      {macro.value} / {macro.target} {macro.unit}
                    </Text>
                  </View>
                  <Progress value={pct} className="h-2" />
                </View>
              );
            })}
            {summary?.adherence ? (
              <View className="flex-row items-center justify-between border-t-hairline border-separator pt-2">
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
          logs.length === 0
            ? 'Quick-add a meal below or apply a template.'
            : `${logs.length} item${logs.length === 1 ? '' : 's'}`
        }
      />
      {logs.length > 0 ? (
        <ListGroup>
          {logs.map((log) => (
            <ListRow
              key={log.id}
              icon={SaladIcon}
              title={log.foodName}
              subtitle={`${log.mealType} · ${log.quantity}× · ${Math.round(
                log.calories * log.quantity
              )} kcal · P${Math.round(log.proteinGrams * log.quantity)} C${Math.round(
                log.carbsGrams * log.quantity
              )} F${Math.round(log.fatGrams * log.quantity)}`}
              trailing={
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => {
                    Alert.alert('Remove this meal?', `Remove "${log.foodName}" from today's log?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => void removeFoodLog(log.id),
                      },
                    ]);
                  }}>
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
            description="Scan or add your first meal below."
          />
        </Surface>
      )}

      {/* Add food */}
      <SectionHeader
        title="Add Food"
        description="Scan a package or enter macros manually."
      />
      <Surface>
        <OptionChips
          layout="wrap"
          items={[...ADD_FOOD_MODE_OPTIONS]}
          value={addFoodMode}
          onValueChange={(value) => setAddFoodMode(value as 'scan' | 'manual')}
        />

        {addFoodMode === 'scan' ? (
          <>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Icon as={BarcodeIcon} size={22} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">
                  Scan packaged food
                </Text>
                <Text className="text-[13px] text-muted-foreground">
                  Look up nutrition values from the barcode, then review before logging.
                </Text>
              </View>
            </View>

            {isScannerOpen ? (
              <View
                className="overflow-hidden rounded-2xl border border-border/70 bg-muted"
                style={{ borderCurve: 'continuous' }}>
                <CameraView
                  style={{ height: 280, width: '100%' }}
                  facing="back"
                  active={isScannerOpen}
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
                <View className="absolute inset-x-0 bottom-0 bg-background/90 p-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-[13px] font-medium text-foreground">
                      Hold the barcode inside the camera view.
                    </Text>
                    <Button variant="outline" size="sm" onPress={() => setIsScannerOpen(false)}>
                      <Text>Cancel</Text>
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <Button variant="outline" onPress={openBarcodeScanner}>
                <Icon as={CameraIcon} size={16} className="text-foreground" />
                <Text>Scan with camera</Text>
              </Button>
            )}

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="Or enter barcode digits"
                  keyboardType="numeric"
                />
              </View>
              <Button
                variant="outline"
                size="icon"
                onPress={() => void handleBarcodeLookup(barcode)}
                disabled={isLookingUpBarcode || !barcode.trim()}>
                {isLookingUpBarcode ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Icon as={BarcodeIcon} size={18} className="text-foreground" />
                )}
              </Button>
            </View>

            {barcodeLookupNotice ? (
              <Text className="text-[13px] text-muted-foreground">{barcodeLookupNotice}</Text>
            ) : null}

            {barcodeResult ? (
              <View className="gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
                <Text className="text-[15px] font-semibold text-foreground">
                  {barcodeResult.food.name}
                </Text>
                <Text className="text-[13px] text-muted-foreground">
                  {barcodeResult.food.brand ? `${barcodeResult.food.brand} · ` : ''}
                  {barcodeResult.food.servingLabel} · {Math.round(barcodeResult.food.calories)} kcal
                  · P{Math.round(barcodeResult.food.proteinGrams)} C
                  {Math.round(barcodeResult.food.carbsGrams)} F
                  {Math.round(barcodeResult.food.fatGrams)}
                </Text>
                <Button
                  variant="outline"
                  onPress={() => {
                    applyFoodToQuickAdd(barcodeResult.food);
                    setAddFoodMode('manual');
                  }}>
                  <Text>Review in manual entry</Text>
                </Button>
              </View>
            ) : null}
          </>
        ) : null}

        {addFoodMode === 'manual' ? (
          <>
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
          </>
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
      {trendSummary.points.length > 0 ? (
        <>
          <SectionHeader title="7-Day Trend" />
          <Surface>
            <View className="flex-row items-start justify-between gap-3">
              <View className="gap-1">
                <Text className="text-[15px] font-semibold text-foreground">
                  Calories & consistency
                </Text>
                <Text className="text-[13px] text-muted-foreground">
                  Avg {trendSummary.averageCalories} kcal/day
                </Text>
              </View>
              {trendSummary.averageAdherence !== null ? (
                <Badge variant={trendSummary.averageAdherence >= 80 ? 'default' : 'secondary'}>
                  <Text>{trendSummary.averageAdherence}% avg</Text>
                </Badge>
              ) : null}
            </View>

            <View className="h-[154px] flex-row items-end gap-2 pt-3">
              {trendSummary.points.map((point) => {
                const calories = Math.round(point.calories);
                const barHeight = Math.max(
                  12,
                  Math.round((calories / trendSummary.maxCalories) * 112)
                );
                const adherence = point.adherenceScore;
                const isStrongDay = adherence !== null && adherence >= 80;
                const isToday = point.logDate === logDate;

                return (
                  <View key={point.logDate} className="flex-1 items-center gap-2">
                    <View className="h-[112px] w-full justify-end overflow-hidden rounded-xl bg-muted/60">
                      <View
                        className={
                          isStrongDay
                            ? 'w-full rounded-xl bg-primary'
                            : 'w-full rounded-xl bg-muted-foreground/35'
                        }
                        style={{ height: barHeight }}
                      />
                    </View>
                    <Text
                      className={
                        isToday
                          ? 'text-[11px] font-bold text-primary'
                          : 'text-[11px] font-medium text-muted-foreground'
                      }>
                      {new Date(`${point.logDate}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short',
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View className="flex-row items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
              <Text className="text-[12px] text-muted-foreground">Best day</Text>
              <Text
                className="text-[12px] font-semibold text-foreground"
                style={{ fontVariant: ['tabular-nums'] }}>
                {Math.max(...trendSummary.points.map((point) => Math.round(point.calories)))} kcal
              </Text>
            </View>
          </Surface>
        </>
      ) : null}
    </Screen>
  );
}
