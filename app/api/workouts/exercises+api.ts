import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exerciseCatalog } from '@/lib/db/schema';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { ensureStarterWorkoutsSeeded } from '@/lib/workouts/server';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    await ensureStarterWorkoutsSeeded();

    const [starterExercises, customExercises] = await Promise.all([
      db.query.exerciseCatalog.findMany({
        where: eq(exerciseCatalog.isStarter, true),
        orderBy: [asc(exerciseCatalog.name)],
      }),
      db.query.exerciseCatalog.findMany({
        where: and(eq(exerciseCatalog.createdByUserId, user.id), eq(exerciseCatalog.isStarter, false)),
        orderBy: [asc(exerciseCatalog.createdAt)],
      }),
    ]);

    return Response.json({
      starterExercises,
      customExercises,
      exercises: [...starterExercises, ...customExercises],
    });
  } catch (error) {
    console.error('Could not list exercises', error);
    return Response.json({ error: 'Could not list exercises.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      muscleGroup?: string;
      equipment?: string;
      isCompound?: boolean;
    };

    const name = body.name?.trim();
    const muscleGroup = body.muscleGroup?.trim();

    if (!name || !muscleGroup) {
      return Response.json({ error: 'name and muscleGroup are required.' }, { status: 400 });
    }

    const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
    const id = crypto.randomUUID();

    const insertedRows = await db
      .insert(exerciseCatalog)
      .values({
        id,
        name,
        slug,
        muscleGroup,
        equipment: body.equipment?.trim() || null,
        isCompound: Boolean(body.isCompound),
        isStarter: false,
        createdByUserId: user.id,
      })
      .returning();

    const exercise = insertedRows[0];

    return Response.json({ exercise }, { status: 201 });
  } catch (error) {
    console.error('Could not create custom exercise', error);
    return Response.json({ error: 'Could not create exercise.' }, { status: 500 });
  }
}
