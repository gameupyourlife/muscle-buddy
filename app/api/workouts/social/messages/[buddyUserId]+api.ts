import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { listMessages, sendMessage } from '@/lib/workouts/social-server';

export async function GET(request: Request, { buddyUserId }: { buddyUserId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const messages = await listMessages(user.id, buddyUserId);
    return Response.json({ messages });
  } catch (error) {
    console.error('Could not load messages', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not load messages.' },
      { status: 403 }
    );
  }
}

export async function POST(request: Request, { buddyUserId }: { buddyUserId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { body?: string };

    if (!body?.body?.trim()) {
      return Response.json({ error: 'body is required.' }, { status: 400 });
    }

    const message = await sendMessage(user.id, buddyUserId, body.body);
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Could not send message', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not send message.' },
      { status: 403 }
    );
  }
}
