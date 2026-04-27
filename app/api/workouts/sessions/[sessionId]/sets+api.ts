import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exerciseCatalog, workoutSessionSets, workoutSessions } from '@/lib/db/schema';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';

export async function POST(request: Request, { sessionId }: { sessionId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const session = await db.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id)),
    });

    if (!session) {
      return Response.json({ error: 'Workout session not found.' }, { status: 404 });
    }

    if (session.status === 'completed') {
      return Response.json({ error: 'Workout session is already completed.' }, { status: 400 });
    }

    const body = (await request.json()) as {
      exerciseId?: string;
      setNumber?: number;
      reps?: number;
      weight?: number;
      isWarmup?: boolean;
    };

    const exerciseId = body.exerciseId?.trim();
    const reps = Number(body.reps);
    const weight = Number(body.weight);

    if (!exerciseId || !Number.isFinite(reps) || reps <= 0 || !Number.isFinite(weight) || weight < 0) {
      return Response.json({ error: 'exerciseId, reps (>0), and weight (>=0) are required.' }, { status: 400 });
    }

    const exercise = await db.query.exerciseCatalog.findFirst({ where: eq(exerciseCatalog.id, exerciseId) });

    if (!exercise) {
      return Response.json({ error: 'Exercise not found.' }, { status: 404 });
    }

    let setNumber = Number(body.setNumber);

    if (!Number.isFinite(setNumber) || setNumber <= 0) {
      const latestSet = await db.query.workoutSessionSets.findFirst({
        where: eq(workoutSessionSets.sessionId, sessionId),
        orderBy: [desc(workoutSessionSets.setNumber)],
      });
      setNumber = (latestSet?.setNumber ?? 0) + 1;
    }

    const insertedRows = await db
      .insert(workoutSessionSets)
      .values({
        id: crypto.randomUUID(),
        sessionId,
        exerciseId,
        setNumber: Math.floor(setNumber),
        reps: Math.floor(reps),
        weight: Math.floor(weight),
        isWarmup: Boolean(body.isWarmup),
      })
      .returning();

    return Response.json({ set: insertedRows[0] }, { status: 201 });
  } catch (error) {
    console.error('Could not add workout set', error);
    return Response.json({ error: 'Could not add workout set.' }, { status: 500 });
  }
}
