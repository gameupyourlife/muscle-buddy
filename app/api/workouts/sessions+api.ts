import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { trainingPlans, workoutSessions } from '@/lib/db/schema';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const sessions = await db.query.workoutSessions.findMany({
      where: eq(workoutSessions.userId, user.id),
      orderBy: [desc(workoutSessions.startedAt)],
      limit: 20,
      with: {
        plan: true,
        sets: {
          with: {
            exercise: true,
          },
        },
      },
    });

    return Response.json({ sessions });
  } catch (error) {
    console.error('Could not list sessions', error);
    return Response.json({ error: 'Could not list sessions.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      planId?: string;
      useActivePlan?: boolean;
      source?: string;
      startedAt?: string;
      notes?: string;
    };

    let planId = body.planId;
    const useActivePlan = body.useActivePlan !== false;

    if (!planId && useActivePlan) {
      const activePlan = await db.query.trainingPlans.findFirst({
        where: and(eq(trainingPlans.userId, user.id), eq(trainingPlans.isActive, true)),
      });
      planId = activePlan?.id;
    }

    if (planId) {
      const plan = await db.query.trainingPlans.findFirst({
        where: and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, user.id)),
      });

      if (!plan) {
        return Response.json({ error: 'Plan not found.' }, { status: 404 });
      }
    }

    const id = crypto.randomUUID();

    const insertedRows = await db
      .insert(workoutSessions)
      .values({
        id,
        userId: user.id,
        planId: planId ?? null,
        status: 'in_progress',
        source: body.source?.trim() || 'manual',
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        notes: body.notes?.trim() || null,
      })
      .returning();

    return Response.json({ session: insertedRows[0] }, { status: 201 });
  } catch (error) {
    console.error('Could not create session', error);
    return Response.json({ error: 'Could not create session.' }, { status: 500 });
  }
}
