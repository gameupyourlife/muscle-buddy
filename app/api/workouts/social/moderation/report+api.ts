import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { reportUser } from '@/lib/workouts/social-server';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      reportedUserId?: string;
      category?: string;
      details?: string | null;
    };

    if (!body.reportedUserId?.trim()) {
      return Response.json({ error: 'reportedUserId is required.' }, { status: 400 });
    }

    if (!body.category?.trim()) {
      return Response.json({ error: 'category is required.' }, { status: 400 });
    }

    const report = await reportUser(user.id, body.reportedUserId, body.category, body.details ?? null);
    return Response.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Could not create report', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not create report.' },
      { status: 400 }
    );
  }
}
