import { LEVEL_THRESHOLDS, WEEKDAY_INDEX, WORKOUT_XP_CONFIG } from '@/lib/workouts/constants';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? Number.NaN);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? Number.NaN);
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? Number.NaN);
  const weekday = parts.find((part) => part.type === 'weekday')?.value as keyof typeof WEEKDAY_INDEX | undefined;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !weekday) {
    throw new Error('Could not resolve week key parts.');
  }

  return { year, month, day, weekday };
}

function toIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function getWeekKey(date: Date, timeZone: string) {
  const localParts = toDateParts(date, timeZone);
  const mondayOffset = WEEKDAY_INDEX[localParts.weekday];
  const pseudoUtcDate = new Date(Date.UTC(localParts.year, localParts.month - 1, localParts.day));
  pseudoUtcDate.setUTCDate(pseudoUtcDate.getUTCDate() - mondayOffset);
  return toIsoDate(pseudoUtcDate);
}

export function isConsecutiveWeek(previousWeekKey: string, currentWeekKey: string) {
  const previous = new Date(`${previousWeekKey}T00:00:00.000Z`);
  const current = new Date(`${currentWeekKey}T00:00:00.000Z`);

  if (Number.isNaN(previous.getTime()) || Number.isNaN(current.getTime())) {
    return false;
  }

  const difference = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
  return difference === 7;
}

export function getStreakMultiplier(streak: number) {
  const normalizedStreak = Math.max(0, streak);
  const multiplier = 1 + normalizedStreak * WORKOUT_XP_CONFIG.streakBuffPerLevel;
  return Math.min(multiplier, WORKOUT_XP_CONFIG.maxBuffMultiplier);
}

export function calculateWorkoutXp(streak: number) {
  const baseXp = WORKOUT_XP_CONFIG.baseWorkoutXp;
  const multiplier = getStreakMultiplier(streak);
  const buffXp = Math.max(0, Math.floor(baseXp * (multiplier - 1)));

  return {
    baseXp,
    buffXp,
    totalXp: baseXp + buffXp,
    multiplier,
  };
}

export function getLevelFromXp(totalXp: number) {
  let level = 1;

  for (let thresholdIndex = 0; thresholdIndex < LEVEL_THRESHOLDS.length; thresholdIndex += 1) {
    if (totalXp >= LEVEL_THRESHOLDS[thresholdIndex]) {
      level = thresholdIndex + 1;
      continue;
    }

    break;
  }

  return level;
}
