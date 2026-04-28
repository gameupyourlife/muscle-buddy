import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { applyMealTemplate, resolveTimeZone } from '@/lib/workouts/food-server';
import { isMealType } from '@/lib/workouts/nutrition';

export async function POST(request: Request, { templateId }: { templateId: string }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      logDate?: string;
      mealType?: string;
      timeZone?: string;
    };

    const mealType = body.mealType?.trim();

    if (mealType && !isMealType(mealType)) {
      return Response.json({ error: 'mealType must be breakfast, lunch, dinner, or snack.' }, { status: 400 });
    }

    const normalizedMealType = mealType && isMealType(mealType) ? mealType : undefined;

    const result = await applyMealTemplate({
      userId: user.id,
      templateId,
      logDate: body.logDate,
      mealType: normalizedMealType,
      timeZone: resolveTimeZone(body.timeZone),
    });

    if (!result) {
      return Response.json({ error: 'Meal template not found.' }, { status: 404 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Could not apply meal template', error);
    return Response.json({ error: 'Could not apply meal template.' }, { status: 500 });
  }
}
