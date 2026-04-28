import { NUTRITION_MEAL_TYPES, NUTRITION_XP_CONFIG } from '@/lib/workouts/constants';

export type MealType = (typeof NUTRITION_MEAL_TYPES)[number];

export type NutritionGoals = {
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

export type NutritionTotals = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type MacroAdherence = {
  protein: number;
  carbs: number;
  fat: number;
  score: number;
};

const DAY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getDayFormatter(timeZone: string) {
  const existing = DAY_FORMATTER_CACHE.get(timeZone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  DAY_FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

function toDateParts(date: Date, timeZone: string) {
  const formatter = getDayFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Could not resolve local date key.');
  }

  return { year, month, day };
}

export function getLocalDateKey(date: Date, timeZone: string) {
  const parts = toDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isMealType(value: string): value is MealType {
  return NUTRITION_MEAL_TYPES.includes(value as MealType);
}

function computeProteinAdherence(actual: number, target: number) {
  if (target <= 0) {
    return 1;
  }

  return clamp(actual / target);
}

function computeCarbsFatAdherence(actual: number, target: number) {
  if (target <= 0) {
    return 1;
  }

  const ratio = actual / target;

  if (ratio <= 1) {
    return clamp(ratio);
  }

  const overageStart = 1 + NUTRITION_XP_CONFIG.carbsFatOveragePenaltyStart;

  if (ratio <= overageStart) {
    return 1;
  }

  const overagePercentBeyondBand = (ratio - overageStart) * 100;
  const penalty = overagePercentBeyondBand / 100;

  return clamp(1 - penalty);
}

export function calculateMacroAdherence(
  totals: NutritionTotals,
  goals: NutritionGoals
): MacroAdherence {
  const protein = computeProteinAdherence(totals.proteinGrams, goals.proteinTarget);
  const carbs = computeCarbsFatAdherence(totals.carbsGrams, goals.carbsTarget);
  const fat = computeCarbsFatAdherence(totals.fatGrams, goals.fatTarget);
  const score = clamp((protein + carbs + fat) / 3);

  return {
    protein,
    carbs,
    fat,
    score,
  };
}

export function calculateNutritionXp(adherenceScore: number) {
  return Math.round(clamp(adherenceScore) * NUTRITION_XP_CONFIG.maxDailyXp);
}

export function toPercent(value: number) {
  return Math.round(clamp(value) * 100);
}
