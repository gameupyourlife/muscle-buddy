import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { listNotifications, markNotificationsRead } from '@/lib/workouts/social-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const notifications = await listNotifications(user.id);
    return Response.json({ notifications });
  } catch (error) {
    console.error('Could not load notifications', error);
    return Response.json({ error: 'Could not load notifications.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      notificationIds?: string[];
    };

    const notifications = await markNotificationsRead(
      user.id,
      Array.isArray(body.notificationIds) ? body.notificationIds : []
    );

    return Response.json({ notifications });
  } catch (error) {
    console.error('Could not update notifications', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not update notifications.' },
      { status: 400 }
    );
  }
}
