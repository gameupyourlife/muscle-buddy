import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { getSocialProfile, upsertSocialProfile } from '@/lib/workouts/social-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const profile = await getSocialProfile(user.id);
    return Response.json({ profile });
  } catch (error) {
    console.error('Could not load social profile', error);
    return Response.json({ error: 'Could not load social profile.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      experienceLevel?: string;
      trainingGoals?: string[];
      preferredDays?: string[];
      preferredTimeWindows?: string[];
      genderPreference?: string;
      gymDistrict?: string;
      city?: string;
      language?: string;
      bio?: string | null;
      isDiscoverable?: boolean;
      isPrivateProfile?: boolean;
      searchRadiusKm?: number;
      areaLatE5?: number | null;
      areaLngE5?: number | null;
    };

    if (!body.gymDistrict?.trim()) {
      return Response.json({ error: 'gymDistrict is required.' }, { status: 400 });
    }

    if (!body.city?.trim()) {
      return Response.json({ error: 'city is required.' }, { status: 400 });
    }

    if (!body.language?.trim()) {
      return Response.json({ error: 'language is required.' }, { status: 400 });
    }

    const profile = await upsertSocialProfile(user.id, {
      experienceLevel: body.experienceLevel ?? 'beginner',
      trainingGoals: Array.isArray(body.trainingGoals) ? body.trainingGoals : [],
      preferredDays: Array.isArray(body.preferredDays) ? body.preferredDays : [],
      preferredTimeWindows: Array.isArray(body.preferredTimeWindows) ? body.preferredTimeWindows : [],
      genderPreference: body.genderPreference ?? 'any',
      gymDistrict: body.gymDistrict,
      city: body.city,
      language: body.language,
      bio: body.bio ?? null,
      isDiscoverable: body.isDiscoverable ?? true,
      isPrivateProfile: body.isPrivateProfile ?? false,
      searchRadiusKm: Number(body.searchRadiusKm ?? 10),
      areaLatE5: typeof body.areaLatE5 === 'number' ? Math.round(body.areaLatE5) : null,
      areaLngE5: typeof body.areaLngE5 === 'number' ? Math.round(body.areaLngE5) : null,
    });

    return Response.json({ profile });
  } catch (error) {
    console.error('Could not save social profile', error);
    return Response.json({ error: 'Could not save social profile.' }, { status: 500 });
  }
}
