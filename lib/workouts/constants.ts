export const WORKOUT_XP_CONFIG = {
  baseWorkoutXp: 100,
  weeklyBonusXp: 250,
  streakBuffPerLevel: 0.05,
  maxBuffMultiplier: 2,
} as const;

export const LEVEL_THRESHOLDS = [
  0,
  200,
  450,
  750,
  1100,
  1500,
  1950,
  2450,
  3000,
  3600,
  4300,
  5100,
  6000,
  7000,
  8200,
  9500,
  11000,
  12600,
  14300,
  16100,
  18000,
] as const;

export const WEEKDAY_INDEX = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
} as const;
