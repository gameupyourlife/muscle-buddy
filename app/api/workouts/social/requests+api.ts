import { inArray } from 'drizzle-orm';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { db } from '@/lib/db';
import { user as authUser } from '@/lib/db/schema';
import { listBuddyRequests, respondToBuddyRequest, sendBuddyRequest } from '@/lib/workouts/social-server';

type SocialUserPreview = {
  userId: string;
  displayName: string;
  image: string | null;
};

async function loadUserPreviews(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.map((entry) => entry.trim()).filter((entry) => entry.length > 0))];

  if (uniqueIds.length === 0) {
    return new Map<string, SocialUserPreview>();
  }

  const users = await db.query.user.findMany({ where: inArray(authUser.id, uniqueIds) });

  const userMap = new Map(users.map((entry) => [entry.id, entry]));
  const previewMap = new Map<string, SocialUserPreview>();

  for (const userId of uniqueIds) {
    const user = userMap.get(userId);

    previewMap.set(userId, {
      userId,
      displayName: user?.name || user?.email || userId,
      image: user?.image ?? null,
    });
  }

  return previewMap;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const requests = await listBuddyRequests(user.id);
    const previewMap = await loadUserPreviews([
      ...requests.incoming.map((entry) => entry.fromUserId),
      ...requests.incoming.map((entry) => entry.toUserId),
      ...requests.outgoing.map((entry) => entry.fromUserId),
      ...requests.outgoing.map((entry) => entry.toUserId),
    ]);

    return Response.json({
      incoming: requests.incoming.map((entry) => ({
        ...entry,
        fromProfile: previewMap.get(entry.fromUserId) ?? null,
        toProfile: previewMap.get(entry.toUserId) ?? null,
      })),
      outgoing: requests.outgoing.map((entry) => ({
        ...entry,
        fromProfile: previewMap.get(entry.fromUserId) ?? null,
        toProfile: previewMap.get(entry.toUserId) ?? null,
      })),
    });
  } catch (error) {
    console.error('Could not load buddy requests', error);
    return Response.json({ error: 'Could not load buddy requests.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { toUserId?: string; message?: string | null };

    if (!body.toUserId?.trim()) {
      return Response.json({ error: 'toUserId is required.' }, { status: 400 });
    }

    const result = await sendBuddyRequest(user.id, {
      toUserId: body.toUserId,
      message: body.message ?? null,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error('Could not send buddy request', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not send buddy request.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      requestId?: string;
      action?: 'accept' | 'decline';
    };

    if (!body.requestId?.trim()) {
      return Response.json({ error: 'requestId is required.' }, { status: 400 });
    }

    if (body.action !== 'accept' && body.action !== 'decline') {
      return Response.json({ error: 'action must be accept or decline.' }, { status: 400 });
    }

    const updated = await respondToBuddyRequest(user.id, {
      requestId: body.requestId,
      action: body.action,
    });

    return Response.json({ request: updated });
  } catch (error) {
    console.error('Could not update buddy request', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not update buddy request.' },
      { status: 400 }
    );
  }
}
