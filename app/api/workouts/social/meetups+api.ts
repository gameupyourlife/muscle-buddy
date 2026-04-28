import { inArray } from 'drizzle-orm';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { db } from '@/lib/db';
import { socialProfiles, user as authUser } from '@/lib/db/schema';
import { createMeetupInvite, listMeetupInvites, respondToMeetupInvite } from '@/lib/workouts/social-server';

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

  const [users, profiles] = await Promise.all([
    db.query.user.findMany({ where: inArray(authUser.id, uniqueIds) }),
    db.query.socialProfiles.findMany({ where: inArray(socialProfiles.userId, uniqueIds) }),
  ]);

  const userMap = new Map(users.map((entry) => [entry.id, entry]));
  const profileMap = new Map(profiles.map((entry) => [entry.userId, entry]));
  const previewMap = new Map<string, SocialUserPreview>();

  for (const userId of uniqueIds) {
    const user = userMap.get(userId);
    const profile = profileMap.get(userId);

    previewMap.set(userId, {
      userId,
      displayName: profile?.displayName || user?.name || user?.email || userId,
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
    const meetups = await listMeetupInvites(user.id);
    const previewMap = await loadUserPreviews([
      ...meetups.incoming.map((entry) => entry.senderUserId),
      ...meetups.incoming.map((entry) => entry.receiverUserId),
      ...meetups.outgoing.map((entry) => entry.senderUserId),
      ...meetups.outgoing.map((entry) => entry.receiverUserId),
    ]);

    return Response.json({
      incoming: meetups.incoming.map((entry) => ({
        ...entry,
        senderProfile: previewMap.get(entry.senderUserId) ?? null,
        receiverProfile: previewMap.get(entry.receiverUserId) ?? null,
      })),
      outgoing: meetups.outgoing.map((entry) => ({
        ...entry,
        senderProfile: previewMap.get(entry.senderUserId) ?? null,
        receiverProfile: previewMap.get(entry.receiverUserId) ?? null,
      })),
    });
  } catch (error) {
    console.error('Could not load meetup invites', error);
    return Response.json({ error: 'Could not load meetup invites.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      receiverUserId?: string;
      startsAt?: string;
      endsAt?: string;
      gymArea?: string;
      note?: string | null;
    };

    if (!body.receiverUserId?.trim()) {
      return Response.json({ error: 'receiverUserId is required.' }, { status: 400 });
    }

    if (!body.startsAt || !body.endsAt) {
      return Response.json({ error: 'startsAt and endsAt are required.' }, { status: 400 });
    }

    if (!body.gymArea?.trim()) {
      return Response.json({ error: 'gymArea is required.' }, { status: 400 });
    }

    const invite = await createMeetupInvite(user.id, {
      receiverUserId: body.receiverUserId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      gymArea: body.gymArea,
      note: body.note ?? null,
    });

    return Response.json({ invite }, { status: 201 });
  } catch (error) {
    console.error('Could not create meetup invite', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not create meetup invite.' },
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
      inviteId?: string;
      action?: 'accept' | 'decline';
    };

    if (!body.inviteId?.trim()) {
      return Response.json({ error: 'inviteId is required.' }, { status: 400 });
    }

    if (body.action !== 'accept' && body.action !== 'decline') {
      return Response.json({ error: 'action must be accept or decline.' }, { status: 400 });
    }

    const invite = await respondToMeetupInvite(user.id, {
      inviteId: body.inviteId,
      action: body.action,
    });

    return Response.json({ invite });
  } catch (error) {
    console.error('Could not update meetup invite', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not update meetup invite.' },
      { status: 400 }
    );
  }
}
