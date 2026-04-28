import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import {
    createFoodLog,
    listFoodLogsByDate,
    listRecentFoods,
    resolveLogDateFromRequest,
    resolveTimeZone,
} from '@/lib/workouts/food-server';
import { isMealType } from '@/lib/workouts/nutrition';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const timeZone = resolveTimeZone(url.searchParams.get('timeZone'));
    const logDate = resolveLogDateFromRequest(url.searchParams.get('logDate'), timeZone);

    const [logs, recentFoods] = await Promise.all([
      listFoodLogsByDate(user.id, logDate),
      listRecentFoods(user.id),
    ]);

    return Response.json({
      logDate,
      logs,
      recentFoods,
    });
  } catch (error) {
    console.error('Could not load food logs', error);
    return Response.json({ error: 'Could not load food logs.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      catalogFoodId?: string | null;
      foodName?: string;
      mealType?: string;
      quantity?: number;
      calories?: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
      notes?: string | null;
      logDate?: string;
      timeZone?: string;
    };

    const foodName = body.foodName?.trim();

    if (!foodName) {
      return Response.json({ error: 'foodName is required.' }, { status: 400 });
    }

    const mealType = body.mealType?.trim() ?? '';

    if (!isMealType(mealType)) {
      return Response.json({ error: 'mealType must be breakfast, lunch, dinner, or snack.' }, { status: 400 });
    }

    const calories = Number(body.calories);
    const proteinGrams = Number(body.proteinGrams);
    const carbsGrams = Number(body.carbsGrams);
    const fatGrams = Number(body.fatGrams);

    if (
      !Number.isFinite(calories) ||
      !Number.isFinite(proteinGrams) ||
      !Number.isFinite(carbsGrams) ||
      !Number.isFinite(fatGrams)
    ) {
      return Response.json({ error: 'Calories and macros are required.' }, { status: 400 });
    }

    const log = await createFoodLog(
      user.id,
      {
        catalogFoodId: body.catalogFoodId,
        foodName,
        mealType,
        quantity: Number(body.quantity ?? 1),
        calories,
        proteinGrams,
        carbsGrams,
        fatGrams,
        notes: body.notes,
        logDate: body.logDate,
      },
      resolveTimeZone(body.timeZone)
    );

    return Response.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Could not create food log', error);
    return Response.json({ error: 'Could not create food log.' }, { status: 500 });
  }
}
