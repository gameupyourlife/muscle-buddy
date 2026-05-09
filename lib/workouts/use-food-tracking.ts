import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import { NUTRITION_MEAL_TYPES } from '@/lib/workouts/constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

export type MealType = (typeof NUTRITION_MEAL_TYPES)[number];

export type NutritionGoals = {
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

export type FoodLog = {
  id: string;
  userId: string;
  catalogFoodId: string | null;
  foodName: string;
  mealType: MealType;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  logDate: string;
  loggedAt: string;
  lastEditedAt: string;
};

export type FoodSummary = {
  logDate: string;
  goals: NutritionGoals | null;
  totals: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  adherence: {
    protein: number;
    carbs: number;
    fat: number;
    score: number;
  } | null;
  nutritionXpAwarded: number;
  nutritionXpPotential: number;
};

export type TrendPoint = {
  logDate: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  adherenceScore: number | null;
};

export type FoodCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string;
  servingQuantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isPublic: boolean;
  createdByUserId: string | null;
};

export type MealTemplate = {
  id: string;
  userId: string;
  name: string;
  mealType: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    templateId: string;
    catalogFoodId: string | null;
    foodName: string;
    quantity: number;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    sortOrder: number;
    createdAt: string;
  }>;
};

export type BarcodeResult = {
  source: 'local' | 'openfoodfacts';
  food:
    | FoodCatalogItem
    | {
        name: string;
        brand: string | null;
        barcode: string | null;
        servingLabel: string;
        servingQuantity: number;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      };
};

export const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const FOOD_FOCUS_REFRESH_COOLDOWN_MS = 45_000;

type FoodCacheSnapshot = {
  logDate: string;
  goals: NutritionGoals | null;
  logs: FoodLog[];
  recentFoods: FoodLog[];
  summary: FoodSummary | null;
  trendPoints: TrendPoint[];
  mealTemplates: MealTemplate[];
  cachedAt: number;
};

type LoadFoodOptions = {
  force?: boolean;
  silent?: boolean;
};

let foodCache: FoodCacheSnapshot | null = null;
let foodLoadPromise: Promise<void> | null = null;

function updateFoodCache(
  patch: Partial<Omit<FoodCacheSnapshot, 'cachedAt'>>
) {
  const nextCache: FoodCacheSnapshot = {
    logDate: patch.logDate ?? foodCache?.logDate ?? getTodayDateKey(),
    goals: patch.goals ?? foodCache?.goals ?? null,
    logs: patch.logs ?? foodCache?.logs ?? [],
    recentFoods: patch.recentFoods ?? foodCache?.recentFoods ?? [],
    summary: patch.summary ?? foodCache?.summary ?? null,
    trendPoints: patch.trendPoints ?? foodCache?.trendPoints ?? [],
    mealTemplates: patch.mealTemplates ?? foodCache?.mealTemplates ?? [],
    cachedAt: Date.now(),
  };

  foodCache = nextCache;
  return nextCache.cachedAt;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useFoodTrackingData() {
  const [logDate, setLogDate] = useState(foodCache?.logDate ?? getTodayDateKey);
  const [goals, setGoals] = useState<NutritionGoals | null>(foodCache?.goals ?? null);
  const [logs, setLogs] = useState<FoodLog[]>(foodCache?.logs ?? []);
  const [recentFoods, setRecentFoods] = useState<FoodLog[]>(foodCache?.recentFoods ?? []);
  const [summary, setSummary] = useState<FoodSummary | null>(foodCache?.summary ?? null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>(foodCache?.trendPoints ?? []);
  const [catalogResults, setCatalogResults] = useState<FoodCatalogItem[]>([]);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>(foodCache?.mealTemplates ?? []);

  const [isLoading, setIsLoading] = useState(!foodCache);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [isWorkingWithTemplates, setIsWorkingWithTemplates] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(Boolean(foodCache));
  const lastSyncAtRef = useRef(foodCache?.cachedAt ?? 0);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const apiCall = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!apiBaseUrl) {
        throw new Error('No API base URL available. Set EXPO_PUBLIC_API_BASE_URL for native builds.');
      }

      const shouldAddNgrokHeader = apiBaseUrl.includes('ngrok');
      const cookies = authClient.getCookie();
      const headers = new Headers(init?.headers);

      headers.set('Content-Type', 'application/json');

      if (shouldAddNgrokHeader) {
        headers.set('ngrok-skip-browser-warning', 'true');
      }

      if (cookies) {
        headers.set('Cookie', cookies);
      }

      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
      });

      const body = (await response.json().catch(() => null)) as T & { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error || `Request failed with status ${response.status}.`);
      }

      if (!body) {
        throw new Error('Unexpected empty response body.');
      }

      return body;
    },
    [apiBaseUrl]
  );

  const refreshGoals = useCallback(async () => {
    const response = await apiCall<{ goals: NutritionGoals | null }>('/api/workouts/food/goals');
    setGoals(response.goals);
    lastSyncAtRef.current = updateFoodCache({ goals: response.goals });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshLogs = useCallback(
    async (dateValue: string) => {
      const response = await apiCall<{ logDate: string; logs: FoodLog[]; recentFoods: FoodLog[] }>(
        `/api/workouts/food/logs?logDate=${encodeURIComponent(dateValue)}&timeZone=${encodeURIComponent(timeZone)}`
      );
      setLogs(response.logs);
      setRecentFoods(response.recentFoods);
      lastSyncAtRef.current = updateFoodCache({
        logDate: response.logDate,
        logs: response.logs,
        recentFoods: response.recentFoods,
      });
      hasLoadedOnceRef.current = true;
    },
    [apiCall, timeZone]
  );

  const refreshSummary = useCallback(
    async (dateValue: string) => {
      const response = await apiCall<FoodSummary>(
        `/api/workouts/food/summary?logDate=${encodeURIComponent(dateValue)}&timeZone=${encodeURIComponent(timeZone)}&awardXp=true`
      );
      setSummary(response);
      lastSyncAtRef.current = updateFoodCache({ logDate: dateValue, summary: response });
      hasLoadedOnceRef.current = true;
    },
    [apiCall, timeZone]
  );

  const refreshTemplates = useCallback(async () => {
    const response = await apiCall<{ templates: MealTemplate[] }>('/api/workouts/food/templates');
    setMealTemplates(response.templates);
    lastSyncAtRef.current = updateFoodCache({ mealTemplates: response.templates });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshTrends = useCallback(
    async (dateValue: string) => {
      const response = await apiCall<{ points: TrendPoint[] }>(
        `/api/workouts/food/trends?logDate=${encodeURIComponent(dateValue)}&timeZone=${encodeURIComponent(timeZone)}&days=7`
      );
      setTrendPoints(response.points);
      lastSyncAtRef.current = updateFoodCache({ logDate: dateValue, trendPoints: response.points });
      hasLoadedOnceRef.current = true;
    },
    [apiCall, timeZone]
  );

  const loadData = useCallback(
    async (dateValue = logDate, options: LoadFoodOptions = {}) => {
      const { force = false, silent = false } = options;
      const shouldShowSpinner = !silent || !hasLoadedOnceRef.current;
      const currentCacheDate = foodCache?.logDate ?? logDate;

      if (!force && foodLoadPromise) {
        await foodLoadPromise;
        return;
      }

      if (
        !force &&
        hasLoadedOnceRef.current &&
        currentCacheDate === dateValue &&
        Date.now() - lastSyncAtRef.current < FOOD_FOCUS_REFRESH_COOLDOWN_MS
      ) {
        return;
      }

      if (shouldShowSpinner) {
        setIsLoading(true);
      }

      if (!silent) {
        setFeedback(null);
      }
      setErrorMessage(null);

      setLogDate(dateValue);

      const loadPromise = (async () => {
        try {
          await Promise.all([
            refreshGoals(),
            refreshLogs(dateValue),
            refreshSummary(dateValue),
            refreshTrends(dateValue),
            refreshTemplates(),
          ]);
        } catch (error) {
          setErrorMessage(getErrorMessage(error, 'Could not load food tracking data.'));
        }
      })();

      foodLoadPromise = loadPromise;

      try {
        await loadPromise;
      } finally {
        if (foodLoadPromise === loadPromise) {
          foodLoadPromise = null;
        }

        if (shouldShowSpinner) {
          setIsLoading(false);
        }
      }
    },
    [logDate, refreshGoals, refreshLogs, refreshSummary, refreshTemplates, refreshTrends]
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        void loadData(logDate, { force: true });
        return;
      }

      if (Date.now() - lastSyncAtRef.current < FOOD_FOCUS_REFRESH_COOLDOWN_MS) {
        return;
      }

      const interaction = InteractionManager.runAfterInteractions(() => {
        void loadData(logDate, { force: true, silent: true });
      });

      return () => {
        interaction.cancel();
      };
    }, [loadData])
  );

  const updateDate = useCallback(
    async (nextDate: string) => {
      setLogDate(nextDate);
      await loadData(nextDate, { force: true });
    },
    [loadData]
  );

  const refreshNow = useCallback(async () => {
    await loadData(logDate, { force: true });
  }, [loadData, logDate]);

  const saveGoals = useCallback(
    async (nextGoals: NutritionGoals) => {
      setIsSavingGoals(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        const response = await apiCall<{ goals: NutritionGoals }>('/api/workouts/food/goals', {
          method: 'PUT',
          body: JSON.stringify(nextGoals),
        });

        setGoals(response.goals);
        setFeedback('Nutrition goals saved.');
        await refreshSummary(logDate);
        await refreshTrends(logDate);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not save nutrition goals.'));
      } finally {
        setIsSavingGoals(false);
      }
    },
    [apiCall, logDate, refreshSummary, refreshTrends]
  );

  const addFoodLog = useCallback(
    async (payload: {
      catalogFoodId?: string | null;
      foodName: string;
      mealType: MealType;
      quantity: number;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      notes?: string | null;
    }) => {
      setIsSavingLog(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall<{ log: FoodLog }>('/api/workouts/food/logs', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            logDate,
            timeZone,
          }),
        });

        await Promise.all([refreshLogs(logDate), refreshSummary(logDate), refreshTrends(logDate)]);
        setFeedback('Meal logged successfully.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not log meal.'));
      } finally {
        setIsSavingLog(false);
      }
    },
    [apiCall, logDate, refreshLogs, refreshSummary, refreshTrends, timeZone]
  );

  const updateFoodLog = useCallback(
    async (
      logId: string,
      payload: {
        mealType?: MealType;
        quantity?: number;
        calories?: number;
        proteinGrams?: number;
        carbsGrams?: number;
        fatGrams?: number;
        notes?: string | null;
      }
    ) => {
      setIsSavingLog(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall<{ log: FoodLog }>(`/api/workouts/food/logs/${encodeURIComponent(logId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            timeZone,
          }),
        });

        await Promise.all([refreshLogs(logDate), refreshSummary(logDate), refreshTrends(logDate)]);
        setFeedback('Food log updated.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not update food log.'));
      } finally {
        setIsSavingLog(false);
      }
    },
    [apiCall, logDate, refreshLogs, refreshSummary, refreshTrends, timeZone]
  );

  const removeFoodLog = useCallback(
    async (logId: string) => {
      setIsSavingLog(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall<{ success: boolean }>(`/api/workouts/food/logs/${encodeURIComponent(logId)}`, {
          method: 'DELETE',
        });

        await Promise.all([refreshLogs(logDate), refreshSummary(logDate), refreshTrends(logDate)]);
        setFeedback('Food log deleted.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not delete food log.'));
      } finally {
        setIsSavingLog(false);
      }
    },
    [apiCall, logDate, refreshLogs, refreshSummary, refreshTrends]
  );

  const searchCatalog = useCallback(
    async (query: string, page = 1, pageSize = 20) => {
      setIsSearchingCatalog(true);
      setErrorMessage(null);

      try {
        const response = await apiCall<{ foods: FoodCatalogItem[] }>(
          `/api/workouts/food/catalog?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
        );
        setCatalogResults(response.foods);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not search food catalog.'));
      } finally {
        setIsSearchingCatalog(false);
      }
    },
    [apiCall]
  );

  const createCatalogFood = useCallback(
    async (payload: {
      name: string;
      brand?: string | null;
      barcode?: string | null;
      servingLabel?: string;
      servingQuantity?: number;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
    }) => {
      setErrorMessage(null);

      try {
        const response = await apiCall<{ food: FoodCatalogItem }>('/api/workouts/food/catalog', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setFeedback('Saved to your private catalog.');
        return response.food;
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not create catalog item.'));
        return null;
      }
    },
    [apiCall]
  );

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      setIsLookingUpBarcode(true);
      setErrorMessage(null);

      try {
        const response = await apiCall<{ result: BarcodeResult | null }>(
          `/api/workouts/food/barcode?barcode=${encodeURIComponent(barcode)}`
        );
        setBarcodeResult(response.result);
        return response.result;
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not look up barcode.'));
        return null;
      } finally {
        setIsLookingUpBarcode(false);
      }
    },
    [apiCall]
  );

  const createMealTemplate = useCallback(
    async (payload: {
      name: string;
      mealType?: MealType;
      items: Array<{
        catalogFoodId?: string | null;
        foodName: string;
        quantity: number;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      }>;
    }) => {
      setIsWorkingWithTemplates(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        const response = await apiCall<{ template: MealTemplate }>('/api/workouts/food/templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setFeedback('Meal template created.');
        await refreshTemplates();
        return response.template;
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not create meal template.'));
        return null;
      } finally {
        setIsWorkingWithTemplates(false);
      }
    },
    [apiCall, refreshTemplates]
  );

  const applyMealTemplate = useCallback(
    async (templateId: string, mealTypeOverride?: MealType) => {
      setIsWorkingWithTemplates(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall<{ inserted: FoodLog[] }>(
          `/api/workouts/food/templates/${encodeURIComponent(templateId)}/apply`,
          {
            method: 'POST',
            body: JSON.stringify({
              logDate,
              timeZone,
              mealType: mealTypeOverride,
            }),
          }
        );

        await Promise.all([refreshLogs(logDate), refreshSummary(logDate), refreshTrends(logDate)]);
        setFeedback('Template applied to current day.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not apply meal template.'));
      } finally {
        setIsWorkingWithTemplates(false);
      }
    },
    [apiCall, logDate, refreshLogs, refreshSummary, refreshTrends, timeZone]
  );

  return {
    apiBaseUrl,
    timeZone,
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
    setFeedback,
    setErrorMessage,
    setBarcodeResult,
    loadData,
    refreshNow,
    updateDate,
    saveGoals,
    addFoodLog,
    updateFoodLog,
    removeFoodLog,
    searchCatalog,
    createCatalogFood,
    lookupBarcode,
    createMealTemplate,
    applyMealTemplate,
  };
}
