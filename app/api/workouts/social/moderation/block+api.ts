import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { blockUser } from '@/lib/workouts/social-server';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { blockedUserId?: string; reason?: string | null };

    if (!body.blockedUserId?.trim()) {
      return Response.json({ error: 'blockedUserId is required.' }, { status: 400 });
    }

    const result = await blockUser(user.id, body.blockedUserId, body.reason ?? null);
    return Response.json(result);
  } catch (error) {
    console.error('Could not block user', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not block user.' },
      { status: 400 }
    );
  }
}
