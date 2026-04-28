import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import {
    listNutritionTrends,
    resolveLogDateFromRequest,
    resolveTimeZone,
} from '@/lib/workouts/food-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const timeZone = resolveTimeZone(url.searchParams.get('timeZone'));
    const logDate = resolveLogDateFromRequest(url.searchParams.get('logDate'), timeZone);
    const days = Number(url.searchParams.get('days') ?? '7');

    const points = await listNutritionTrends(user.id, logDate, days);

    return Response.json({
      points,
      logDate,
      days: Math.max(1, Math.min(30, Math.floor(days))),
    });
  } catch (error) {
    console.error('Could not load nutrition trends', error);
    return Response.json({ error: 'Could not load nutrition trends.' }, { status: 500 });
  }
}
