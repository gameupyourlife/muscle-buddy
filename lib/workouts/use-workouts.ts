import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import {
  type CharacterId,
  type CharacterSelection,
  toCharacterSelectionRecord,
} from '@/lib/workouts/character';
import { STARTER_EXERCISES } from '@/lib/workouts/starter-data';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  isStarter: boolean;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  dayOfWeek: number | null;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  notes: string | null;
  exercise: Exercise;
};

export type DashboardResponse = {
  weekKey: string;
  gamification: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    characterGender: CharacterId;
    equippedHeadItem: string;
    equippedTopItem: string;
    equippedPantsItem: string;
    equippedShoesItem: string;
  } | null;
  weeklyProgress: {
    completedWorkouts: number;
    weeklyTarget: number;
  } | null;
  activePlan: {
    id: string;
    name: string;
    weeklyTarget: number;
    exercises: PlanExercise[];
  } | null;
  recentSessions: Array<{ id: string; startedAt: string; status: string }>;
};

export type Template = {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  weeklyTarget: number;
};

export type TrainingPlan = {
  id: string;
  name: string;
  weeklyTarget: number;
  isActive: boolean;
  exercises: PlanExercise[];
};

export type SessionSet = {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  createdAt?: string;
  exercise?: {
    id: string;
    name: string;
  } | null;
};

export type Session = {
  id: string;
  status: string;
  startedAt: string;
  planId?: string | null;
  sets: SessionSet[];
};

export type PlanExerciseDraft = {
  key: string;
  exerciseId: string;
  dayOfWeek: number;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
};

export type TrackingMode = 'free' | 'plan';

export const DAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '7', label: 'Sun' },
];

export const WEEKLY_TARGET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '2', label: '2 workouts/week' },
  { value: '3', label: '3 workouts/week' },
  { value: '4', label: '4 workouts/week' },
  { value: '5', label: '5 workouts/week' },
  { value: '6', label: '6 workouts/week' },
];

export const TRACKING_MODE_OPTIONS: Array<{ value: TrackingMode; label: string }> = [
  { value: 'free', label: 'Free training' },
  { value: 'plan', label: 'Plan day training' },
];

const DEFAULT_REPS = '8';
const DEFAULT_WEIGHT = '60';
const FOCUS_REFRESH_COOLDOWN_MS = 45_000;

type WorkoutsCacheSnapshot = {
  dashboard: DashboardResponse | null;
  templates: Template[];
  plans: TrainingPlan[];
  exercises: Exercise[];
  recentSessions: Session[];
  activeSession: Session | null;
  cachedAt: number;
};

type LoadWorkoutsOptions = {
  force?: boolean;
  silent?: boolean;
};

type PreloadWorkoutsOptions = {
  force?: boolean;
};

let workoutsCache: WorkoutsCacheSnapshot | null = null;
let workoutsLoadPromise: Promise<void> | null = null;

function updateWorkoutsCache(
  patch: Partial<Omit<WorkoutsCacheSnapshot, 'cachedAt'>>
) {
  const nextCache: WorkoutsCacheSnapshot = {
    dashboard: patch.dashboard ?? workoutsCache?.dashboard ?? null,
    templates: patch.templates ?? workoutsCache?.templates ?? [],
    plans: patch.plans ?? workoutsCache?.plans ?? [],
    exercises: patch.exercises ?? workoutsCache?.exercises ?? [],
    recentSessions: patch.recentSessions ?? workoutsCache?.recentSessions ?? [],
    activeSession: patch.activeSession ?? workoutsCache?.activeSession ?? null,
    cachedAt: Date.now(),
  };

  workoutsCache = nextCache;
  return nextCache.cachedAt;
}

const createLocalId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function getTodayWorkoutDayValue() {
  const jsDay = new Date().getDay();
  return String(jsDay === 0 ? 7 : jsDay);
}

function mergeCharacterSelectionIntoDashboard(
  dashboard: DashboardResponse | null,
  selection: CharacterSelection
): DashboardResponse | null {
  if (!dashboard) {
    return dashboard;
  }

  const characterRecord = toCharacterSelectionRecord(selection);

  return {
    ...dashboard,
    gamification: {
      totalXp: dashboard.gamification?.totalXp ?? 0,
      level: dashboard.gamification?.level ?? 1,
      currentStreak: dashboard.gamification?.currentStreak ?? 0,
      longestStreak: dashboard.gamification?.longestStreak ?? 0,
      ...characterRecord,
    },
  };
}

export async function preloadWorkoutsData(options: PreloadWorkoutsOptions = {}) {
  const { force = false } = options;

  if (!force && workoutsLoadPromise) {
    await workoutsLoadPromise;
    return;
  }

  if (
    !force &&
    workoutsCache &&
    Date.now() - workoutsCache.cachedAt < FOCUS_REFRESH_COOLDOWN_MS
  ) {
    return;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('No API base URL available. Set EXPO_PUBLIC_API_BASE_URL for native builds.');
  }

  const shouldAddNgrokHeader = apiBaseUrl.includes('ngrok');

  const apiCall = async <T,>(path: string, init?: RequestInit): Promise<T> => {
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
  };

  const fallbackExercises = STARTER_EXERCISES.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    isStarter: true,
  }));

  const loadPromise = (async () => {
    const [dashboardResult, templatesResult, plansResult, sessionsResult, exercisesResult] = await Promise.allSettled([
      apiCall<DashboardResponse>(
        `/api/workouts/dashboard?timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`
      ),
      apiCall<{ templates: Template[] }>('/api/workouts/templates'),
      apiCall<{ plans: TrainingPlan[] }>('/api/workouts/plans'),
      apiCall<{ sessions: Session[] }>('/api/workouts/sessions'),
      apiCall<{ exercises: Exercise[] }>('/api/workouts/exercises'),
    ]);

    const nextDashboard =
      dashboardResult.status === 'fulfilled' ? dashboardResult.value : workoutsCache?.dashboard ?? null;
    const nextTemplates =
      templatesResult.status === 'fulfilled' ? templatesResult.value.templates : workoutsCache?.templates ?? [];
    const nextPlans = plansResult.status === 'fulfilled' ? plansResult.value.plans : workoutsCache?.plans ?? [];
    const nextSessions =
      sessionsResult.status === 'fulfilled' ? sessionsResult.value.sessions : workoutsCache?.recentSessions ?? [];
    const nextActiveSession = nextSessions.find((session) => session.status === 'in_progress') ?? null;
    const nextExercises =
      exercisesResult.status === 'fulfilled' && exercisesResult.value.exercises.length > 0
        ? exercisesResult.value.exercises
        : workoutsCache?.exercises && workoutsCache.exercises.length > 0
          ? workoutsCache.exercises
          : fallbackExercises;

    updateWorkoutsCache({
      dashboard: nextDashboard,
      templates: nextTemplates,
      plans: nextPlans,
      recentSessions: nextSessions,
      activeSession: nextActiveSession,
      exercises: nextExercises,
    });
  })();

  workoutsLoadPromise = loadPromise;

  try {
    await loadPromise;
  } finally {
    if (workoutsLoadPromise === loadPromise) {
      workoutsLoadPromise = null;
    }
  }
}

export function useWorkoutsData() {
  const fallbackExercises = useMemo<Exercise[]>(
    () =>
      STARTER_EXERCISES.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        isStarter: true,
      })),
    []
  );

  const fallbackExerciseId = fallbackExercises[0]?.id ?? '';

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(workoutsCache?.dashboard ?? null);
  const [templates, setTemplates] = useState<Template[]>(workoutsCache?.templates ?? []);
  const [plans, setPlans] = useState<TrainingPlan[]>(workoutsCache?.plans ?? []);
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    if (workoutsCache?.exercises && workoutsCache.exercises.length > 0) {
      return workoutsCache.exercises;
    }

    return fallbackExercises;
  });
  const [recentSessions, setRecentSessions] = useState<Session[]>(workoutsCache?.recentSessions ?? []);
  const [activeSession, setActiveSession] = useState<Session | null>(workoutsCache?.activeSession ?? null);

  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState(getTodayWorkoutDayValue);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('free');
  const [trackerExerciseId, setTrackerExerciseId] = useState(fallbackExerciseId);
  const [reps, setReps] = useState(DEFAULT_REPS);
  const [weight, setWeight] = useState(DEFAULT_WEIGHT);

  const [customExerciseId, setCustomExerciseId] = useState(fallbackExerciseId);
  const [customPlanName, setCustomPlanName] = useState('My Custom Plan');
  const [customPlanWeeklyTarget, setCustomPlanWeeklyTarget] = useState('3');
  const [customPlanExercises, setCustomPlanExercises] = useState<PlanExerciseDraft[]>([]);

  const [planEditorName, setPlanEditorName] = useState('');
  const [planEditorWeeklyTarget, setPlanEditorWeeklyTarget] = useState('3');
  const [planEditorExerciseId, setPlanEditorExerciseId] = useState(fallbackExerciseId);
  const [planEditorExercises, setPlanEditorExercises] = useState<PlanExerciseDraft[]>([]);

  const [isLoading, setIsLoading] = useState(!workoutsCache);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [isCreatingCustomPlan, setIsCreatingCustomPlan] = useState(false);
  const [isStartingPlanSetup, setIsStartingPlanSetup] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingCharacterSelection, setIsSavingCharacterSelection] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(Boolean(workoutsCache));
  const lastSyncAtRef = useRef(workoutsCache?.cachedAt ?? 0);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

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

  const refreshDashboard = useCallback(async () => {
    const localeTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dashboardData = await apiCall<DashboardResponse>(
      `/api/workouts/dashboard?timeZone=${encodeURIComponent(localeTimeZone)}`
    );
    setDashboard(dashboardData);
    lastSyncAtRef.current = updateWorkoutsCache({ dashboard: dashboardData });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const updateCharacterSelection = useCallback(
    async (selection: CharacterSelection) => {
      setIsSavingCharacterSelection(true);
      setErrorMessage(null);

      setDashboard((current) => {
        const nextDashboard = mergeCharacterSelectionIntoDashboard(current, selection);

        if (nextDashboard) {
          lastSyncAtRef.current = updateWorkoutsCache({ dashboard: nextDashboard });
        }

        return nextDashboard;
      });

      try {
        const response = await apiCall<{ gamification: NonNullable<DashboardResponse['gamification']> }>(
          '/api/workouts/character',
          {
            method: 'PATCH',
            body: JSON.stringify(selection),
          }
        );

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          const nextDashboard = {
            ...current,
            gamification: response.gamification,
          };

          lastSyncAtRef.current = updateWorkoutsCache({ dashboard: nextDashboard });
          return nextDashboard;
        });
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not save character selection.'));
        await refreshDashboard().catch(() => undefined);
      } finally {
        setIsSavingCharacterSelection(false);
      }
    },
    [apiCall, refreshDashboard]
  );

  const refreshSessions = useCallback(async () => {
    const sessionsResponse = await apiCall<{ sessions: Session[] }>('/api/workouts/sessions');
    const active = sessionsResponse.sessions.find((session) => session.status === 'in_progress') ?? null;
    setRecentSessions(sessionsResponse.sessions);
    setActiveSession(active);
    lastSyncAtRef.current = updateWorkoutsCache({
      recentSessions: sessionsResponse.sessions,
      activeSession: active,
    });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const loadInitialData = useCallback(async (options: LoadWorkoutsOptions = {}) => {
    const { force = false, silent = false } = options;
    const shouldShowSpinner = !silent || !hasLoadedOnceRef.current;

    if (!force && workoutsLoadPromise) {
      await workoutsLoadPromise;
      return;
    }

    if (
      !force &&
      hasLoadedOnceRef.current &&
      Date.now() - lastSyncAtRef.current < FOCUS_REFRESH_COOLDOWN_MS
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

    const loadPromise = (async () => {
      try {
        const [dashboardResult, templatesResult, plansResult, sessionsResult, exercisesResult] = await Promise.allSettled([
          apiCall<DashboardResponse>(
            `/api/workouts/dashboard?timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`
          ),
          apiCall<{ templates: Template[] }>('/api/workouts/templates'),
          apiCall<{ plans: TrainingPlan[] }>('/api/workouts/plans'),
          apiCall<{ sessions: Session[] }>('/api/workouts/sessions'),
          apiCall<{ exercises: Exercise[] }>('/api/workouts/exercises'),
        ]);

        const nextDashboard =
          dashboardResult.status === 'fulfilled' ? dashboardResult.value : workoutsCache?.dashboard ?? null;
        const nextTemplates =
          templatesResult.status === 'fulfilled' ? templatesResult.value.templates : workoutsCache?.templates ?? [];
        const nextPlans = plansResult.status === 'fulfilled' ? plansResult.value.plans : workoutsCache?.plans ?? [];
        const nextSessions =
          sessionsResult.status === 'fulfilled' ? sessionsResult.value.sessions : workoutsCache?.recentSessions ?? [];
        const nextActiveSession = nextSessions.find((session) => session.status === 'in_progress') ?? null;
        const nextExercises =
          exercisesResult.status === 'fulfilled' && exercisesResult.value.exercises.length > 0
            ? exercisesResult.value.exercises
            : workoutsCache?.exercises && workoutsCache.exercises.length > 0
              ? workoutsCache.exercises
              : fallbackExercises;

        setDashboard(nextDashboard);
        setTemplates(nextTemplates);
        setPlans(nextPlans);
        setRecentSessions(nextSessions);
        setActiveSession(nextActiveSession);
        setExercises(nextExercises);
        setTrackerExerciseId((current) => {
          if (current && nextExercises.some((exercise) => exercise.id === current)) {
            return current;
          }
          return nextExercises[0]?.id ?? '';
        });
        setCustomExerciseId((current) => {
          if (current && nextExercises.some((exercise) => exercise.id === current)) {
            return current;
          }
          return nextExercises[0]?.id ?? '';
        });

        lastSyncAtRef.current = updateWorkoutsCache({
          dashboard: nextDashboard,
          templates: nextTemplates,
          plans: nextPlans,
          recentSessions: nextSessions,
          activeSession: nextActiveSession,
          exercises: nextExercises,
        });
        hasLoadedOnceRef.current = true;

        const hasAnyFailure =
          dashboardResult.status === 'rejected' ||
          templatesResult.status === 'rejected' ||
          plansResult.status === 'rejected' ||
          sessionsResult.status === 'rejected' ||
          exercisesResult.status === 'rejected';

        if (hasAnyFailure) {
          setErrorMessage('Some workout data could not be synced. You can still use available selections and retry.');
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not load workouts data.'));
      }
    })();

    workoutsLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (workoutsLoadPromise === loadPromise) {
        workoutsLoadPromise = null;
      }

      if (shouldShowSpinner) {
        setIsLoading(false);
      }
    }
  }, [apiCall, fallbackExercises]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        void loadInitialData({ force: true });
        return;
      }

      if (Date.now() - lastSyncAtRef.current < FOCUS_REFRESH_COOLDOWN_MS) {
        return;
      }

      const interaction = InteractionManager.runAfterInteractions(() => {
        void loadInitialData({ force: true, silent: true });
      });

      return () => {
        interaction.cancel();
      };
    }, [loadInitialData])
  );

  const refreshNow = useCallback(async () => {
    await loadInitialData({ force: true });
  }, [loadInitialData]);

  const activePlan = dashboard?.activePlan ?? null;

  useEffect(() => {
    if (!activePlan && trackingMode === 'plan') {
      setTrackingMode('free');
    }
  }, [activePlan, trackingMode]);

  useEffect(() => {
    if (!activePlan) {
      setPlanEditorName('');
      setPlanEditorWeeklyTarget('3');
      setPlanEditorExercises([]);
      return;
    }

    setPlanEditorName(activePlan.name);
    setPlanEditorWeeklyTarget(String(activePlan.weeklyTarget));
    setPlanEditorExercises(
      activePlan.exercises.map((entry, index) => ({
        key: `${entry.id}-${index}`,
        exerciseId: entry.exerciseId,
        dayOfWeek: entry.dayOfWeek ?? 1,
        targetSets: String(entry.targetSets),
        targetReps: String(entry.targetReps),
        targetWeight: String(entry.targetWeight ?? 0),
      }))
    );

    setPlanEditorExerciseId((current) => current || activePlan.exercises[0]?.exerciseId || fallbackExerciseId);
  }, [activePlan, fallbackExerciseId]);

  const selectedWorkoutDayNumber = Number(selectedWorkoutDay);

  const selectedWorkoutDayLabel =
    DAY_OPTIONS.find((option) => option.value === selectedWorkoutDay)?.label ?? 'Day';

  const selectedWorkoutDayPlanExercises = useMemo(
    () =>
      (dashboard?.activePlan?.exercises ?? [])
        .filter((entry) => entry.dayOfWeek === selectedWorkoutDayNumber)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [dashboard?.activePlan?.exercises, selectedWorkoutDayNumber]
  );

  const currentSessionSetCountByExercise = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const set of activeSession?.sets ?? []) {
      counts[set.exerciseId] = (counts[set.exerciseId] ?? 0) + 1;
    }

    return counts;
  }, [activeSession?.sets]);

  const exerciseSelectOptions = exercises.map((exercise) => ({
    value: exercise.id,
    label: exercise.name,
  }));

  const trackerExerciseOptions = useMemo(() => {
    if (trackingMode === 'free') {
      return exerciseSelectOptions;
    }

    if (!activePlan || selectedWorkoutDayPlanExercises.length === 0) {
      return [];
    }

    const uniqueByExercise = new Map<string, { value: string; label: string }>();

    for (const entry of selectedWorkoutDayPlanExercises) {
      if (!uniqueByExercise.has(entry.exerciseId)) {
        uniqueByExercise.set(entry.exerciseId, {
          value: entry.exerciseId,
          label: entry.exercise.name,
        });
      }
    }

    return [...uniqueByExercise.values()];
  }, [activePlan, exerciseSelectOptions, selectedWorkoutDayPlanExercises, trackingMode]);

  const suggestedTrackerExerciseId = useMemo(() => {
    if (trackingMode === 'plan' && selectedWorkoutDayPlanExercises.length > 0) {
      const nextPlanned = selectedWorkoutDayPlanExercises.find(
        (entry) => !currentSessionSetCountByExercise[entry.exerciseId]
      );

      return (
        nextPlanned?.exerciseId ??
        selectedWorkoutDayPlanExercises[0]?.exerciseId ??
        trackerExerciseOptions[0]?.value ??
        ''
      );
    }

    return trackerExerciseOptions[0]?.value ?? '';
  }, [currentSessionSetCountByExercise, selectedWorkoutDayPlanExercises, trackerExerciseOptions, trackingMode]);

  useEffect(() => {
    if (trackerExerciseOptions.length === 0) {
      return;
    }

    if (!trackerExerciseOptions.some((option) => option.value === trackerExerciseId)) {
      setTrackerExerciseId(suggestedTrackerExerciseId || trackerExerciseOptions[0].value);
    }
  }, [suggestedTrackerExerciseId, trackerExerciseId, trackerExerciseOptions]);

  const latestCompletedPerformanceByExercise = useMemo(() => {
    const latestByExercise = new Map<string, { reps: number; weight: number; startedAt: string }>();

    for (const session of recentSessions) {
      if (session.status !== 'completed' || session.id === activeSession?.id) {
        continue;
      }

      const sortedSets = [...(session.sets ?? [])].sort((a, b) => b.setNumber - a.setNumber);

      for (const set of sortedSets) {
        if (!latestByExercise.has(set.exerciseId)) {
          latestByExercise.set(set.exerciseId, {
            reps: set.reps,
            weight: set.weight,
            startedAt: session.startedAt,
          });
        }
      }
    }

    return latestByExercise;
  }, [activeSession?.id, recentSessions]);

  const trackerLastPerformance =
    (trackerExerciseId && latestCompletedPerformanceByExercise.get(trackerExerciseId)) || null;

  const getLastPerformanceForExercise = useCallback(
    (exerciseId: string) => latestCompletedPerformanceByExercise.get(exerciseId) ?? null,
    [latestCompletedPerformanceByExercise]
  );

  useEffect(() => {
    if (!trackerExerciseId) {
      return;
    }

    const latestPerformance = latestCompletedPerformanceByExercise.get(trackerExerciseId);

    if (latestPerformance) {
      setReps(String(latestPerformance.reps));
      setWeight(String(latestPerformance.weight));
    }
  }, [latestCompletedPerformanceByExercise, trackerExerciseId]);

  const selectedTrackerExerciseLabel =
    trackerExerciseOptions.find((option) => option.value === trackerExerciseId)?.label ??
    exercises.find((exercise) => exercise.id === trackerExerciseId)?.name ??
    'Choose an exercise';

  const suggestedTrackerExerciseLabel =
    trackerExerciseOptions.find((option) => option.value === suggestedTrackerExerciseId)?.label ??
    'No suggestion';

  const addExerciseToCustomPlan = useCallback(() => {
    if (!customExerciseId) {
      setErrorMessage('Select an exercise first.');
      return;
    }

    setErrorMessage(null);
    setCustomPlanExercises((current) => [
      ...current,
      {
        key: createLocalId(),
        exerciseId: customExerciseId,
        dayOfWeek: (current.length % 7) + 1,
        targetSets: '3',
        targetReps: '8',
        targetWeight: '50',
      },
    ]);
  }, [customExerciseId]);

  const removeCustomPlanExercise = useCallback((draftKey: string) => {
    setCustomPlanExercises((current) => current.filter((entry) => entry.key !== draftKey));
  }, []);

  const updateCustomPlanExercise = useCallback(
    (draftKey: string, updates: Partial<Omit<PlanExerciseDraft, 'key' | 'exerciseId'>>) => {
      setCustomPlanExercises((current) =>
        current.map((entry) => {
          if (entry.key !== draftKey) {
            return entry;
          }

          return {
            ...entry,
            ...updates,
          };
        })
      );
    },
    []
  );

  const createPlanFromTemplate = useCallback(
    async (templateId: string) => {
      setIsStartingPlanSetup(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        const created = await apiCall<{ planId: string }>('/api/workouts/plans', {
          method: 'POST',
          body: JSON.stringify({
            mode: 'template',
            templateId,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        await apiCall('/api/workouts/plans', {
          method: 'PUT',
          body: JSON.stringify({
            planId: created.planId,
            isActive: true,
          }),
        });

        setFeedback('Template selected. Your personalized plan is ready to edit.');
        await loadInitialData({ force: true });
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not import template.'));
      } finally {
        setIsStartingPlanSetup(false);
      }
    },
    [apiCall, loadInitialData]
  );

  const createEmptyPlan = useCallback(async () => {
    setIsStartingPlanSetup(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const created = await apiCall<{ planId: string }>('/api/workouts/plans', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'custom',
          name: 'My Plan',
          weeklyTarget: 3,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          exercises: [],
        }),
      });

      await apiCall('/api/workouts/plans', {
        method: 'PUT',
        body: JSON.stringify({
          planId: created.planId,
          isActive: true,
        }),
      });

      setFeedback('Empty plan created. Start personalizing it now.');
      await loadInitialData({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not create empty plan.'));
    } finally {
      setIsStartingPlanSetup(false);
    }
  }, [apiCall, loadInitialData]);

  const createCustomPlan = useCallback(async () => {
    const name = customPlanName.trim();
    const weeklyTarget = Number(customPlanWeeklyTarget);

    if (!name) {
      setErrorMessage('Custom plan name is required.');
      return;
    }

    if (!Number.isFinite(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 14) {
      setErrorMessage('Weekly target must be a number between 1 and 14.');
      return;
    }

    if (customPlanExercises.length === 0) {
      setErrorMessage('Add at least one exercise to your custom plan.');
      return;
    }

    setIsCreatingCustomPlan(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      await apiCall('/api/workouts/plans', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'custom',
          name,
          weeklyTarget,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          exercises: customPlanExercises.map((entry, index) => ({
            exerciseId: entry.exerciseId,
            dayOfWeek: entry.dayOfWeek,
            sortOrder: index,
            targetSets: Math.max(1, Number(entry.targetSets) || 3),
            targetReps: Math.max(1, Number(entry.targetReps) || 8),
            targetWeight: Math.max(0, Number(entry.targetWeight) || 0),
          })),
        }),
      });

      setCustomPlanExercises([]);
      setFeedback('Custom plan created successfully.');
      await loadInitialData({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not create custom plan.'));
    } finally {
      setIsCreatingCustomPlan(false);
    }
  }, [apiCall, customPlanExercises, customPlanName, customPlanWeeklyTarget, loadInitialData]);

  const addExerciseToPlanEditor = useCallback(() => {
    if (!planEditorExerciseId) {
      setErrorMessage('Select an exercise first.');
      return;
    }

    setErrorMessage(null);
    setPlanEditorExercises((current) => [
      ...current,
      {
        key: createLocalId(),
        exerciseId: planEditorExerciseId,
        dayOfWeek: ((current.length % 7) + 1),
        targetSets: '3',
        targetReps: '8',
        targetWeight: '50',
      },
    ]);
  }, [planEditorExerciseId]);

  const removePlanEditorExercise = useCallback((draftKey: string) => {
    setPlanEditorExercises((current) => current.filter((entry) => entry.key !== draftKey));
  }, []);

  const updatePlanEditorExercise = useCallback(
    (draftKey: string, updates: Partial<Omit<PlanExerciseDraft, 'key' | 'exerciseId'>>) => {
      setPlanEditorExercises((current) =>
        current.map((entry) => {
          if (entry.key !== draftKey) {
            return entry;
          }

          return {
            ...entry,
            ...updates,
          };
        })
      );
    },
    []
  );

  const savePlanChanges = useCallback(async () => {
    if (!activePlan) {
      setErrorMessage('Select a starter plan first.');
      return;
    }

    const nextName = planEditorName.trim();
    const nextWeeklyTarget = Number(planEditorWeeklyTarget);

    if (!nextName) {
      setErrorMessage('Plan name is required.');
      return;
    }

    if (!Number.isFinite(nextWeeklyTarget) || nextWeeklyTarget < 1 || nextWeeklyTarget > 14) {
      setErrorMessage('Weekly target must be a number between 1 and 14.');
      return;
    }

    setIsSavingPlan(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      await apiCall('/api/workouts/plans', {
        method: 'PATCH',
        body: JSON.stringify({
          planId: activePlan.id,
          name: nextName,
          weeklyTarget: nextWeeklyTarget,
          exercises: planEditorExercises.map((entry, index) => ({
            exerciseId: entry.exerciseId,
            dayOfWeek: entry.dayOfWeek,
            sortOrder: index,
            targetSets: Math.max(1, Number(entry.targetSets) || 3),
            targetReps: Math.max(1, Number(entry.targetReps) || 8),
            targetWeight: Math.max(0, Number(entry.targetWeight) || 0),
          })),
        }),
      });

      setFeedback('Your plan was updated successfully.');
      await loadInitialData({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not save plan changes.'));
    } finally {
      setIsSavingPlan(false);
    }
  }, [activePlan, apiCall, loadInitialData, planEditorExercises, planEditorName, planEditorWeeklyTarget]);

  const startSession = useCallback(async () => {
    if (trackingMode === 'plan' && !activePlan) {
      setErrorMessage('Choose or create an active plan before starting a plan day workout.');
      return;
    }

    setIsStartingSession(true);
    setErrorMessage(null);
    setFeedback(null);

    const isPlanMode = trackingMode === 'plan';

    try {
      const response = await apiCall<{
        session: {
          id: string;
          status: string;
          startedAt: string;
          planId?: string | null;
        };
      }>('/api/workouts/sessions', {
        method: 'POST',
        body: JSON.stringify({
          source: isPlanMode ? 'plan' : 'free',
          planId: isPlanMode ? activePlan?.id ?? null : null,
          useActivePlan: isPlanMode,
          startedAt: new Date().toISOString(),
        }),
      });

      const nextSession: Session = {
        ...response.session,
        sets: [],
      };

      setActiveSession(nextSession);
      setRecentSessions((current) => [nextSession, ...current.filter((entry) => entry.id !== nextSession.id)]);
      setFeedback(
        isPlanMode
          ? 'Plan day workout started. Log your sets for today\'s exercises in any order.'
          : 'Free workout started. Pick any machine or exercise and log your sets.'
      );
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not start workout session.'));
    } finally {
      setIsStartingSession(false);
    }
  }, [activePlan, apiCall, refreshDashboard, trackingMode]);

  const addSetForExercise = useCallback(
    async (exerciseId: string, repsValue: string, weightValue: string) => {
      if (!activeSession) {
        return;
      }

      const parsedReps = Number(repsValue);
      const parsedWeight = Number(weightValue);

      if (
        !exerciseId ||
        !Number.isFinite(parsedReps) ||
        parsedReps <= 0 ||
        !Number.isFinite(parsedWeight) ||
        parsedWeight < 0
      ) {
        setErrorMessage('Select an exercise and enter valid reps and weight.');
        return;
      }

      setIsAddingSet(true);
      setErrorMessage(null);

      try {
        const response = await apiCall<{ set: SessionSet }>(`/api/workouts/sessions/${activeSession.id}/sets`, {
          method: 'POST',
          body: JSON.stringify({
            exerciseId,
            reps: parsedReps,
            weight: parsedWeight,
          }),
        });

        setActiveSession((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            sets: [...current.sets, response.set],
          };
        });

        setRecentSessions((current) =>
          current.map((session) => {
            if (session.id !== activeSession.id) {
              return session;
            }

            return {
              ...session,
              sets: [...session.sets, response.set],
            };
          })
        );

        setFeedback('Set logged successfully.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not log workout set.'));
      } finally {
        setIsAddingSet(false);
      }
    },
    [activeSession, apiCall]
  );

  const addSet = useCallback(async () => {
    await addSetForExercise(trackerExerciseId, reps, weight);
  }, [addSetForExercise, reps, trackerExerciseId, weight]);

  const completeSession = useCallback(async () => {
    if (!activeSession) {
      return;
    }

    setIsCompletingSession(true);
    setErrorMessage(null);

    try {
      const result = await apiCall<{
        awardedXp: number;
        breakdown?: { baseXp: number; buffXp: number; bonusXp: number; multiplier: number };
      }>(`/api/workouts/sessions/${activeSession.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      setActiveSession(null);
      const breakdown = result.breakdown;
      setFeedback(
        breakdown
          ? `Workout complete. +${result.awardedXp} XP (base ${breakdown.baseXp}, buff ${breakdown.buffXp}, weekly bonus ${breakdown.bonusXp}).`
          : `Workout complete. +${result.awardedXp} XP.`
      );

      await Promise.all([refreshDashboard(), refreshSessions()]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not complete workout.'));
    } finally {
      setIsCompletingSession(false);
    }
  }, [activeSession, apiCall, refreshDashboard, refreshSessions]);

  const completed = dashboard?.weeklyProgress?.completedWorkouts ?? 0;
  const target = dashboard?.weeklyProgress?.weeklyTarget ?? dashboard?.activePlan?.weeklyTarget ?? 0;
  const progressValue = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const canCompleteSession = Boolean(activeSession && activeSession.sets.length > 0);

  return {
    apiBaseUrl,
    dashboard,
    templates,
    plans,
    activePlan,
    exercises,
    recentSessions,
    activeSession,
    trackingMode,
    reps,
    weight,
    selectedWorkoutDay,
    selectedWorkoutDayLabel,
    selectedWorkoutDayPlanExercises,
    currentSessionSetCountByExercise,
    trackerExerciseId,
    trackerExerciseOptions,
    suggestedTrackerExerciseId,
    suggestedTrackerExerciseLabel,
    trackerLastPerformance,
    canCompleteSession,
    planEditorName,
    planEditorWeeklyTarget,
    planEditorExerciseId,
    planEditorExercises,
    customExerciseId,
    customPlanName,
    customPlanWeeklyTarget,
    customPlanExercises,
    isLoading,
    isStartingSession,
    isAddingSet,
    isCompletingSession,
    isCreatingCustomPlan,
    isStartingPlanSetup,
    isSavingPlan,
    isSavingCharacterSelection,
    feedback,
    errorMessage,
    completed,
    target,
    progressValue,
    exerciseSelectOptions,
    selectedTrackerExerciseLabel,
    getLastPerformanceForExercise,
    setReps,
    setWeight,
    setTrackingMode,
    setSelectedWorkoutDay,
    setTrackerExerciseId,
    setPlanEditorName,
    setPlanEditorWeeklyTarget,
    setPlanEditorExerciseId,
    setCustomExerciseId,
    setCustomPlanName,
    setCustomPlanWeeklyTarget,
    loadInitialData,
    refreshNow,
    updateCharacterSelection,
    addExerciseToCustomPlan,
    removeCustomPlanExercise,
    updateCustomPlanExercise,
    createPlanFromTemplate,
    createEmptyPlan,
    createCustomPlan,
    addExerciseToPlanEditor,
    removePlanEditorExercise,
    updatePlanEditorExercise,
    savePlanChanges,
    startSession,
    addSetForExercise,
    addSet,
    completeSession,
  };
}
