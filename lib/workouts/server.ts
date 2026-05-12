import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    exerciseCatalog,
    planTemplateExercises,
    planTemplates,
    trainingPlanExercises,
    trainingPlans,
    userGamification,
    weeklyProgress,
    workoutSessions,
    xpEvents,
} from '@/lib/db/schema';
import { toCharacterSelectionRecord } from '@/lib/workouts/character';
import { WORKOUT_XP_CONFIG } from '@/lib/workouts/constants';
import { STARTER_EXERCISES, STARTER_TEMPLATES } from '@/lib/workouts/starter-data';
import { calculateWorkoutXp, getLevelFromXp, getWeekKey, isConsecutiveWeek } from '@/lib/workouts/utils';

export type CustomPlanExerciseInput = {
  exerciseId: string;
  dayOfWeek?: number | null;
  sortOrder?: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number | null;
  notes?: string | null;
};

function createId() {
  return crypto.randomUUID();
}

function requireRow<T>(row: T | undefined, errorMessage: string) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return row;
}

export async function ensureStarterWorkoutsSeeded() {
  await db.transaction(async (tx) => {
    await tx
      .insert(exerciseCatalog)
      .values(
        STARTER_EXERCISES.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          slug: exercise.slug,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          isCompound: exercise.isCompound,
          isStarter: true,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(planTemplates)
      .values(
        STARTER_TEMPLATES.map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          difficulty: template.difficulty,
          weeklyTarget: template.weeklyTarget,
          isPublished: true,
        }))
      )
      .onConflictDoNothing();

    const templateExerciseRows = STARTER_TEMPLATES.flatMap((template) =>
      template.exercises.map((entry) => ({
        id: entry.id,
        templateId: template.id,
        exerciseId: entry.exerciseId,
        dayOfWeek: entry.dayOfWeek,
        sortOrder: entry.sortOrder,
        targetSets: entry.targetSets,
        targetReps: entry.targetReps,
        targetWeight: entry.targetWeight,
        notes: entry.notes,
      }))
    );

    await tx.insert(planTemplateExercises).values(templateExerciseRows).onConflictDoNothing();
  });
}

export async function createPlanFromTemplate(input: {
  userId: string;
  templateId: string;
  name?: string;
  timeZone?: string;
}) {
  const template = await db.query.planTemplates.findFirst({
    where: eq(planTemplates.id, input.templateId),
    with: {
      exercises: {
        with: {
          exercise: true,
        },
      },
    },
  });

  const requiredTemplate = requireRow(template, 'Template not found.');
  const planId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(trainingPlans).values({
      id: planId,
      userId: input.userId,
      name: input.name?.trim() || requiredTemplate.name,
      description: requiredTemplate.description,
      sourceTemplateId: requiredTemplate.id,
      weeklyTarget: requiredTemplate.weeklyTarget,
      timeZone: input.timeZone || 'UTC',
      isActive: false,
    });

    const exerciseRows = requiredTemplate.exercises.map((entry) => ({
      id: createId(),
      planId,
      exerciseId: entry.exerciseId,
      dayOfWeek: entry.dayOfWeek,
      sortOrder: entry.sortOrder,
      targetSets: entry.targetSets,
      targetReps: entry.targetReps,
      targetWeight: entry.targetWeight,
      notes: entry.notes,
    }));

    if (exerciseRows.length > 0) {
      await tx.insert(trainingPlanExercises).values(exerciseRows);
    }
  });

  return planId;
}

export async function createCustomPlan(input: {
  userId: string;
  name: string;
  description?: string;
  weeklyTarget: number;
  timeZone?: string;
  exercises: CustomPlanExerciseInput[];
}) {
  const planId = createId();

  await db.transaction(async (tx) => {
    await tx.insert(trainingPlans).values({
      id: planId,
      userId: input.userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      weeklyTarget: input.weeklyTarget,
      timeZone: input.timeZone || 'UTC',
      isActive: false,
    });

    if (input.exercises.length > 0) {
      await tx.insert(trainingPlanExercises).values(
        input.exercises.map((entry, index) => ({
          id: createId(),
          planId,
          exerciseId: entry.exerciseId,
          dayOfWeek: entry.dayOfWeek,
          sortOrder: entry.sortOrder ?? index,
          targetSets: entry.targetSets,
          targetReps: entry.targetReps,
          targetWeight: entry.targetWeight,
          notes: entry.notes,
        }))
      );
    }
  });

  return planId;
}

export async function activatePlanForUser(userId: string, planId: string) {
  await db.transaction(async (tx) => {
    await tx.update(trainingPlans).set({ isActive: false }).where(eq(trainingPlans.userId, userId));

    await tx
      .update(trainingPlans)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  });
}

export async function completeWorkoutSession(input: {
  userId: string;
  sessionId: string;
  timeZone?: string;
}) {
  return db.transaction(async (tx) => {
    const session = await tx.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, input.userId)),
    });

    const requiredSession = requireRow(session, 'Workout session not found.');

    const completionKey = `session-complete:${input.sessionId}`;
    const existingCompletion = await tx.query.xpEvents.findFirst({
      where: eq(xpEvents.idempotencyKey, completionKey),
    });

    const activePlan = requiredSession.planId
      ? await tx.query.trainingPlans.findFirst({
          where: and(eq(trainingPlans.id, requiredSession.planId), eq(trainingPlans.userId, input.userId)),
        })
      : await tx.query.trainingPlans.findFirst({
          where: and(eq(trainingPlans.userId, input.userId), eq(trainingPlans.isActive, true)),
        });

    const zone = input.timeZone || activePlan?.timeZone || 'UTC';
    const now = new Date();
    const weekKey = getWeekKey(now, zone);
    const weeklyTarget = activePlan?.weeklyTarget ?? 3;

    await tx
      .insert(userGamification)
      .values({
        userId: input.userId,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
      })
      .onConflictDoNothing();

    if (existingCompletion) {
      const existingGamification = await tx.query.userGamification.findFirst({
        where: eq(userGamification.userId, input.userId),
      });
      const existingWeekly = await tx.query.weeklyProgress.findFirst({
        where: and(eq(weeklyProgress.userId, input.userId), eq(weeklyProgress.weekKey, weekKey)),
      });

      return {
        alreadyProcessed: true,
        awardedXp: existingCompletion.totalXp,
        weekKey,
        weeklyProgress: existingWeekly,
        gamification: existingGamification,
      };
    }

    await tx
      .update(workoutSessions)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(workoutSessions.id, input.sessionId));

    await tx
      .insert(weeklyProgress)
      .values({
        id: createId(),
        userId: input.userId,
        weekKey,
        weeklyTarget,
        completedWorkouts: 0,
      })
      .onConflictDoNothing();

    const updatedWeeklyRows = await tx
      .update(weeklyProgress)
      .set({
        completedWorkouts: sql`${weeklyProgress.completedWorkouts} + 1`,
        updatedAt: now,
      })
      .where(and(eq(weeklyProgress.userId, input.userId), eq(weeklyProgress.weekKey, weekKey)))
      .returning();

    const weeklyState = requireRow(updatedWeeklyRows[0], 'Could not update weekly progress.');

    const gamificationState = requireRow(
      await tx.query.userGamification.findFirst({
        where: eq(userGamification.userId, input.userId),
      }),
      'Could not load gamification state.'
    );

    const xpBreakdown = calculateWorkoutXp(gamificationState.currentStreak);
    const reachedWeeklyTarget = weeklyState.completedWorkouts >= weeklyState.weeklyTarget;

    const shouldAwardWeeklyBonus = reachedWeeklyTarget && !weeklyState.bonusXpAwarded;
    const shouldExtendStreak = reachedWeeklyTarget && !weeklyState.streakExtended;

    let nextStreak = gamificationState.currentStreak;
    let nextLongestStreak = gamificationState.longestStreak;
    let nextQualifiedWeek = gamificationState.lastQualifiedWeekKey;

    if (shouldExtendStreak) {
      const extendsCurrentStreak =
        !!gamificationState.lastQualifiedWeekKey &&
        isConsecutiveWeek(gamificationState.lastQualifiedWeekKey, weekKey);

      nextStreak = extendsCurrentStreak ? gamificationState.currentStreak + 1 : 1;
      nextLongestStreak = Math.max(gamificationState.longestStreak, nextStreak);
      nextQualifiedWeek = weekKey;
    }

    const bonusXp = shouldAwardWeeklyBonus ? WORKOUT_XP_CONFIG.weeklyBonusXp : 0;
    const totalAwardedXp = xpBreakdown.totalXp + bonusXp;
    const nextTotalXp = gamificationState.totalXp + totalAwardedXp;
    const nextLevel = getLevelFromXp(nextTotalXp);

    await tx
      .update(userGamification)
      .set({
        totalXp: nextTotalXp,
        level: nextLevel,
        currentStreak: nextStreak,
        longestStreak: nextLongestStreak,
        lastQualifiedWeekKey: nextQualifiedWeek,
        updatedAt: now,
      })
      .where(eq(userGamification.userId, input.userId));

    await tx
      .update(weeklyProgress)
      .set({
        bonusXpAwarded: shouldAwardWeeklyBonus,
        streakExtended: shouldExtendStreak,
        qualifiedAt: reachedWeeklyTarget ? now : weeklyState.qualifiedAt,
        updatedAt: now,
      })
      .where(and(eq(weeklyProgress.userId, input.userId), eq(weeklyProgress.weekKey, weekKey)));

    await tx.insert(xpEvents).values({
      id: createId(),
      userId: input.userId,
      sessionId: input.sessionId,
      weekKey,
      eventType: 'workout_completed',
      baseXp: xpBreakdown.baseXp,
      buffXp: xpBreakdown.buffXp,
      bonusXp,
      totalXp: totalAwardedXp,
      idempotencyKey: completionKey,
    });

    const latestWeekly = await tx.query.weeklyProgress.findFirst({
      where: and(eq(weeklyProgress.userId, input.userId), eq(weeklyProgress.weekKey, weekKey)),
    });

    const latestGamification = await tx.query.userGamification.findFirst({
      where: eq(userGamification.userId, input.userId),
    });

    return {
      alreadyProcessed: false,
      awardedXp: totalAwardedXp,
      weekKey,
      breakdown: {
        baseXp: xpBreakdown.baseXp,
        buffXp: xpBreakdown.buffXp,
        bonusXp,
        multiplier: xpBreakdown.multiplier,
      },
      weeklyProgress: latestWeekly,
      gamification: latestGamification,
    };
  });
}

export async function updateUserCharacterSelection(userId: string, selection: unknown) {
  const characterRecord = toCharacterSelectionRecord(selection);
  const now = new Date();
  const [gamificationState] = await db
    .insert(userGamification)
    .values({
      userId,
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      ...characterRecord,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userGamification.userId,
      set: {
        ...characterRecord,
        updatedAt: now,
      },
    })
    .returning();

  return gamificationState
    ? {
        ...gamificationState,
        level: getLevelFromXp(gamificationState.totalXp),
      }
    : gamificationState;
}

export async function getWorkoutDashboard(userId: string, timeZone?: string) {
  const activePlan = await db.query.trainingPlans.findFirst({
    where: and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)),
    with: {
      exercises: {
        with: {
          exercise: true,
        },
      },
    },
  });

  const zone = timeZone || activePlan?.timeZone || 'UTC';
  const weekKey = getWeekKey(new Date(), zone);

  const [gamificationState, weeklyState, recentSessions] = await Promise.all([
    db.query.userGamification.findFirst({ where: eq(userGamification.userId, userId) }),
    db.query.weeklyProgress.findFirst({
      where: and(eq(weeklyProgress.userId, userId), eq(weeklyProgress.weekKey, weekKey)),
    }),
    db.query.workoutSessions.findMany({
      where: eq(workoutSessions.userId, userId),
      orderBy: [desc(workoutSessions.startedAt)],
      limit: 10,
    }),
  ]);

  const normalizedGamificationState = gamificationState
    ? {
        ...gamificationState,
        level: getLevelFromXp(gamificationState.totalXp),
      }
    : null;

  return {
    weekKey,
    activePlan,
    gamification: normalizedGamificationState,
    weeklyProgress: weeklyState,
    recentSessions,
  };
}
