import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { trainingPlanExercises, trainingPlans } from '@/lib/db/schema';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import {
  activatePlanForUser,
  createCustomPlan,
  createPlanFromTemplate,
  ensureStarterWorkoutsSeeded,
} from '@/lib/workouts/server';

type PlanExerciseInput = {
  exerciseId: string;
  dayOfWeek?: number;
  sortOrder?: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number | null;
  notes?: string | null;
};

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const plans = await db.query.trainingPlans.findMany({
      where: eq(trainingPlans.userId, user.id),
      orderBy: [asc(trainingPlans.createdAt)],
      with: {
        exercises: {
          orderBy: (table, operators) => [operators.asc(table.sortOrder)],
          with: {
            exercise: true,
          },
        },
      },
    });

    return Response.json({ plans });
  } catch (error) {
    console.error('Could not load plans', error);
    return Response.json({ error: 'Could not load plans.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
    
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    await ensureStarterWorkoutsSeeded();

    const body = (await request.json()) as {
      mode?: 'template' | 'custom';
      templateId?: string;
      name?: string;
      description?: string;
      weeklyTarget?: number;
      timeZone?: string;
      exercises?: PlanExerciseInput[];
    };

    if (body.mode === 'template') {
      if (!body.templateId) {
        return Response.json({ error: 'templateId is required for template mode.' }, { status: 400 });
      }

      const planId = await createPlanFromTemplate({
        userId: user.id,
        templateId: body.templateId,
        name: body.name,
        timeZone: body.timeZone,
      });

      return Response.json({ planId }, { status: 201 });
    }

    if (body.mode === 'custom') {
      const name = body.name?.trim();

      if (!name) {
        return Response.json({ error: 'name is required for custom mode.' }, { status: 400 });
      }

      const weeklyTarget = Number(body.weeklyTarget ?? 3);

      if (!Number.isFinite(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 14) {
        return Response.json({ error: 'weeklyTarget must be between 1 and 14.' }, { status: 400 });
      }

      const exercises = Array.isArray(body.exercises) ? body.exercises : [];

      const planId = await createCustomPlan({
        userId: user.id,
        name,
        description: body.description,
        weeklyTarget,
        timeZone: body.timeZone,
        exercises: exercises.map((exercise, index) => ({
          id: crypto.randomUUID(),
          exerciseId: exercise.exerciseId,
          dayOfWeek: exercise.dayOfWeek ?? null,
          sortOrder: exercise.sortOrder ?? index,
          targetSets: Math.max(1, Math.floor(exercise.targetSets)),
          targetReps: Math.max(1, Math.floor(exercise.targetReps)),
          targetWeight: exercise.targetWeight ?? null,
          notes: exercise.notes ?? null,
        })),
      });

      return Response.json({ planId }, { status: 201 });
    }

    return Response.json({ error: 'mode must be either template or custom.' }, { status: 400 });
  } catch (error) {
    console.error('Could not create plan', error);
    return Response.json({ error: 'Could not create plan.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { planId?: string; isActive?: boolean };

    if (!body.planId) {
      return Response.json({ error: 'planId is required.' }, { status: 400 });
    }

    const plan = await db.query.trainingPlans.findFirst({
      where: and(eq(trainingPlans.id, body.planId), eq(trainingPlans.userId, user.id)),
    });

    if (!plan) {
      return Response.json({ error: 'Plan not found.' }, { status: 404 });
    }

    if (body.isActive !== false) {
      await activatePlanForUser(user.id, body.planId);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Could not update plan', error);
    return Response.json({ error: 'Could not update plan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      planId?: string;
      name?: string;
      weeklyTarget?: number;
      exercises?: PlanExerciseInput[];
    };

    if (!body.planId) {
      return Response.json({ error: 'planId is required.' }, { status: 400 });
    }

    const existingPlan = await db.query.trainingPlans.findFirst({
      where: and(eq(trainingPlans.id, body.planId), eq(trainingPlans.userId, user.id)),
    });

    if (!existingPlan) {
      return Response.json({ error: 'Plan not found.' }, { status: 404 });
    }

    const nextName = body.name?.trim();
    const nextWeeklyTarget = Number(body.weeklyTarget ?? existingPlan.weeklyTarget);

    if (!nextName) {
      return Response.json({ error: 'name is required.' }, { status: 400 });
    }

    if (!Number.isFinite(nextWeeklyTarget) || nextWeeklyTarget < 1 || nextWeeklyTarget > 14) {
      return Response.json({ error: 'weeklyTarget must be between 1 and 14.' }, { status: 400 });
    }

    const nextExercises = Array.isArray(body.exercises) ? body.exercises : null;

    await db.transaction(async (tx) => {
      await tx
        .update(trainingPlans)
        .set({
          name: nextName,
          weeklyTarget: Math.floor(nextWeeklyTarget),
          updatedAt: new Date(),
        })
        .where(and(eq(trainingPlans.id, body.planId as string), eq(trainingPlans.userId, user.id)));

      if (nextExercises) {
        await tx.delete(trainingPlanExercises).where(eq(trainingPlanExercises.planId, body.planId as string));

        if (nextExercises.length > 0) {
          await tx.insert(trainingPlanExercises).values(
            nextExercises.map((exercise, index) => ({
              id: crypto.randomUUID(),
              planId: body.planId as string,
              exerciseId: exercise.exerciseId,
              dayOfWeek: exercise.dayOfWeek ?? null,
              sortOrder: exercise.sortOrder ?? index,
              targetSets: Math.max(1, Math.floor(exercise.targetSets)),
              targetReps: Math.max(1, Math.floor(exercise.targetReps)),
              targetWeight: exercise.targetWeight ?? null,
              notes: exercise.notes ?? null,
            }))
          );
        }
      }
    });

    const updatedPlan = await db.query.trainingPlans.findFirst({
      where: and(eq(trainingPlans.id, body.planId), eq(trainingPlans.userId, user.id)),
      with: {
        exercises: {
          orderBy: (table, operators) => [operators.asc(table.sortOrder)],
          with: {
            exercise: true,
          },
        },
      },
    });

    return Response.json({ plan: updatedPlan });
  } catch (error) {
    console.error('Could not patch plan', error);
    return Response.json({ error: 'Could not patch plan.' }, { status: 500 });
  }
}
