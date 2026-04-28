import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { discoverBuddies } from '@/lib/workouts/social-server';

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

    return Response.json({ buddies });
  } catch (error) {
    console.error('Could not discover buddies', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not discover buddies.' },
      { status: 400 }
    );
  }
}
