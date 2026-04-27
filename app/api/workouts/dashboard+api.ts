import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { getWorkoutDashboard } from '@/lib/workouts/server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const timeZone = url.searchParams.get('timeZone') ?? undefined;

    const dashboard = await getWorkoutDashboard(user.id, timeZone);
    return Response.json(dashboard);
  } catch (error) {
    console.error('Could not load dashboard', error);
    return Response.json({ error: 'Could not load workout dashboard.' }, { status: 500 });
  }
}
