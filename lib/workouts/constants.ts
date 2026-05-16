export const WORKOUT_XP_CONFIG = {
  baseWorkoutXp: 100,
  weeklyBonusXp: 250,
  missedWeekDecayXp: 50,
  streakBuffPerLevel: 0.05,
  maxBuffMultiplier: 2,
} as const;

export const NUTRITION_XP_CONFIG = {
  maxDailyXp: 10,
  toleranceFraction: 0.1,
  carbsFatOveragePenaltyStart: 0.1,
} as const;

export const NUTRITION_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const LEVEL_THRESHOLDS = [0, 1000, 3500, 7500, 12500] as const;

export const WEEKDAY_INDEX = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
} as const;
