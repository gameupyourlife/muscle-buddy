import { inArray } from 'drizzle-orm';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { db } from '@/lib/db';
import { user as authUser } from '@/lib/db/schema';
import { listBuddies } from '@/lib/workouts/social-server';

type SocialUserPreview = {
  userId: string;
  displayName: string;
  image: string | null;
};

type SocialProfile = {
  userId: string;
  experienceLevel: string;
  trainingGoals: string;
  preferredDays: string;
  preferredTimeWindows: string;
  genderPreference: string;
  gymDistrict: string;
  city: string;
  language: string;
  bio: string | null;
  isDiscoverable: boolean;
  isPrivateProfile: boolean;
  searchRadiusKm: number;
  areaLatE5: number | null;
  areaLngE5: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSocialProfileFromUser(entry: typeof authUser.$inferSelect): SocialProfile {
  return {
    userId: entry.id,
    experienceLevel: entry.socialExperienceLevel,
    trainingGoals: entry.socialTrainingGoals,
    preferredDays: entry.socialPreferredDays,
    preferredTimeWindows: entry.socialPreferredTimeWindows,
    genderPreference: entry.socialGenderPreference,
    gymDistrict: entry.socialGymDistrict,
    city: entry.socialCity,
    language: entry.socialLanguage,
    bio: entry.socialBio,
    isDiscoverable: entry.socialIsDiscoverable,
    isPrivateProfile: entry.socialIsPrivateProfile,
    searchRadiusKm: entry.socialSearchRadiusKm,
    areaLatE5: entry.socialAreaLatE5,
    areaLngE5: entry.socialAreaLngE5,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

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

    const users = await db.query.user.findMany({
      where: inArray(authUser.id, buddyUserIds),
    });

    const userMap = new Map(users.map((entry) => [entry.id, entry]));

    return Response.json({
      buddies: buddyRows.map((entry) => {
        const buddyUserId = entry.userAId === user.id ? entry.userBId : entry.userAId;
        const buddyUser = userMap.get(buddyUserId);
        const preview: SocialUserPreview = {
          userId: buddyUserId,
          displayName: buddyUser?.name || buddyUser?.email || buddyUserId,
          image: buddyUser?.image ?? null,
        };

        return {
          id: entry.id,
          buddyUserId,
          connectedAt: entry.connectedAt,
          preview,
          profile: buddyUser ? toSocialProfileFromUser(buddyUser) : null,
        };
      }),
    });
  } catch (error) {
    console.error('Could not load buddies', error);
    return Response.json({ error: 'Could not load buddies.' }, { status: 500 });
  }
}
