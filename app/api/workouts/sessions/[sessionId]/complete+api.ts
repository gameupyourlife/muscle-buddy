import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { completeWorkoutSession } from '@/lib/workouts/server';

export async function POST(request: Request, { sessionId }: { sessionId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { timeZone?: string };

    const completion = await completeWorkoutSession({
      userId: user.id,
      sessionId,
      timeZone: body.timeZone,
    });

    return Response.json(completion);
  } catch (error) {
    console.error('Could not complete workout session', error);
    return Response.json({ error: 'Could not complete workout session.' }, { status: 500 });
  }
}
