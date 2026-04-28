import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { getNutritionGoals, upsertNutritionGoals } from '@/lib/workouts/food-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const goals = await getNutritionGoals(user.id);
    return Response.json({ goals });
  } catch (error) {
    console.error('Could not load nutrition goals', error);
    return Response.json({ error: 'Could not load nutrition goals.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      caloriesTarget?: number;
      proteinTarget?: number;
      carbsTarget?: number;
      fatTarget?: number;
    };

    const caloriesTarget = Number(body.caloriesTarget);
    const proteinTarget = Number(body.proteinTarget);
    const carbsTarget = Number(body.carbsTarget);
    const fatTarget = Number(body.fatTarget);

    if (
      !Number.isFinite(caloriesTarget) ||
      !Number.isFinite(proteinTarget) ||
      !Number.isFinite(carbsTarget) ||
      !Number.isFinite(fatTarget)
    ) {
      return Response.json({ error: 'All nutrition goal values must be valid numbers.' }, { status: 400 });
    }

    if (proteinTarget <= 0 || carbsTarget <= 0 || fatTarget <= 0 || caloriesTarget <= 0) {
      return Response.json({ error: 'Goal values must be greater than zero.' }, { status: 400 });
    }

    const goals = await upsertNutritionGoals(user.id, {
      caloriesTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
    });

    return Response.json({ goals });
  } catch (error) {
    console.error('Could not save nutrition goals', error);
    return Response.json({ error: 'Could not save nutrition goals.' }, { status: 500 });
  }
}
