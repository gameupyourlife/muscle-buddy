import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planTemplates } from '@/lib/db/schema';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { ensureStarterWorkoutsSeeded } from '@/lib/workouts/server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    await ensureStarterWorkoutsSeeded();

    const templates = await db.query.planTemplates.findMany({
      where: eq(planTemplates.isPublished, true),
      orderBy: [asc(planTemplates.name)],
      with: {
        exercises: {
          orderBy: (table, operators) => [operators.asc(table.sortOrder)],
          with: {
            exercise: true,
          },
        },
      },
    });

    return Response.json({ templates });
  } catch (error) {
    console.error('Could not load templates', error);
    return Response.json({ error: 'Could not load plan templates.' }, { status: 500 });
  }
}
