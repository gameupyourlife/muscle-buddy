import { inArray } from 'drizzle-orm';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { db } from '@/lib/db';
import { socialProfiles } from '@/lib/db/schema';
import { listBuddies } from '@/lib/workouts/social-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const buddyRows = await listBuddies(user.id);

    if (buddyRows.length === 0) {
      return Response.json({ buddies: [] });
    }

    const buddyUserIds = buddyRows.map((entry) =>
      entry.userAId === user.id ? entry.userBId : entry.userAId
    );

    const profiles = await db.query.socialProfiles.findMany({
      where: inArray(socialProfiles.userId, buddyUserIds),
    });

    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));

    return Response.json({
      buddies: buddyRows.map((entry) => {
        const buddyUserId = entry.userAId === user.id ? entry.userBId : entry.userAId;

        return {
          id: entry.id,
          buddyUserId,
          connectedAt: entry.connectedAt,
          profile: profileMap.get(buddyUserId) ?? null,
        };
      }),
    });
  } catch (error) {
    console.error('Could not load buddies', error);
    return Response.json({ error: 'Could not load buddies.' }, { status: 500 });
  }
}
