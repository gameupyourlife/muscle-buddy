import { inArray } from 'drizzle-orm';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { db } from '@/lib/db';
import { user as authUser } from '@/lib/db/schema';
import { discoverBuddies } from '@/lib/workouts/social-server';

type SocialUserPreview = {
  userId: string;
  displayName: string;
  image: string | null;
};

function parseCsv(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);

    const buddies = await discoverBuddies(user.id, {
      radiusKm: Number(url.searchParams.get('radiusKm') ?? 10),
      goals: parseCsv(url.searchParams.get('goals')),
      experienceLevel: url.searchParams.get('experienceLevel') ?? undefined,
      preferredDays: parseCsv(url.searchParams.get('preferredDays')),
      genderPreference: url.searchParams.get('genderPreference') ?? undefined,
      district: url.searchParams.get('district') ?? undefined,
      language: url.searchParams.get('language') ?? undefined,
    });

    const candidateUserIds = buddies.map((entry) => entry.userId);
    const users =
      candidateUserIds.length > 0
        ? await db.query.user.findMany({ where: inArray(authUser.id, candidateUserIds) })
        : [];
    const userMap = new Map(users.map((entry) => [entry.id, entry]));

    return Response.json({
      buddies: buddies.map((profile) => {
        const buddyUser = userMap.get(profile.userId);
        const preview: SocialUserPreview = {
          userId: profile.userId,
          displayName: buddyUser?.name || buddyUser?.email || profile.userId,
          image: buddyUser?.image ?? null,
        };

        return {
          profile,
          preview,
        };
      }),
    });
  } catch (error) {
    console.error('Could not discover buddies', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not discover buddies.' },
      { status: 400 }
    );
  }
}
