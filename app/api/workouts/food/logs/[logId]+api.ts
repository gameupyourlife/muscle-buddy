import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { deleteFoodLog, resolveTimeZone, updateFoodLog } from '@/lib/workouts/food-server';
import { isMealType } from '@/lib/workouts/nutrition';

export async function PATCH(request: Request, { logId }: { logId: string }) {
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

    if (typeof body.mealType !== 'undefined' && !isMealType(body.mealType)) {
      return Response.json({ error: 'mealType must be breakfast, lunch, dinner, or snack.' }, { status: 400 });
    }

    const next = await updateFoodLog(
      user.id,
      logId,
      {
        catalogFoodId: body.catalogFoodId,
        foodName: body.foodName,
        mealType: body.mealType,
        quantity: typeof body.quantity === 'undefined' ? undefined : Number(body.quantity),
        calories: typeof body.calories === 'undefined' ? undefined : Number(body.calories),
        proteinGrams: typeof body.proteinGrams === 'undefined' ? undefined : Number(body.proteinGrams),
        carbsGrams: typeof body.carbsGrams === 'undefined' ? undefined : Number(body.carbsGrams),
        fatGrams: typeof body.fatGrams === 'undefined' ? undefined : Number(body.fatGrams),
        notes: body.notes,
        logDate: body.logDate,
      },
      resolveTimeZone(body.timeZone)
    );

    if (!next) {
      return Response.json({ error: 'Food log not found.' }, { status: 404 });
    }

    return Response.json({ log: next });
  } catch (error) {
    console.error('Could not update food log', error);
    return Response.json({ error: 'Could not update food log.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { logId }: { logId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const deleted = await deleteFoodLog(user.id, logId);

    if (!deleted) {
      return Response.json({ error: 'Food log not found.' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Could not delete food log', error);
    return Response.json({ error: 'Could not delete food log.' }, { status: 500 });
  }
}
