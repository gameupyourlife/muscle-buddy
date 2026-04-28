import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import {
    getDailyNutritionSummary,
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
    const awardXp = url.searchParams.get('awardXp') !== 'false';

    const summary = await getDailyNutritionSummary(user.id, logDate, { awardXp });

    return Response.json(summary);
  } catch (error) {
    console.error('Could not load nutrition summary', error);
    return Response.json({ error: 'Could not load nutrition summary.' }, { status: 500 });
  }
}
