import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { createMealTemplate, listMealTemplates } from '@/lib/workouts/food-server';
import { isMealType } from '@/lib/workouts/nutrition';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const templates = await listMealTemplates(user.id);
    return Response.json({ templates });
  } catch (error) {
    console.error('Could not load meal templates', error);
    return Response.json({ error: 'Could not load meal templates.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      mealType?: string;
      items?: Array<{
        catalogFoodId?: string | null;
        foodName?: string;
        quantity?: number;
        calories?: number;
        proteinGrams?: number;
        carbsGrams?: number;
        fatGrams?: number;
        sortOrder?: number;
      }>;
    };

    const name = body.name?.trim();

    if (!name) {
      return Response.json({ error: 'name is required.' }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return Response.json({ error: 'At least one template item is required.' }, { status: 400 });
    }

    const mealType = body.mealType?.trim();

    if (mealType && !isMealType(mealType)) {
      return Response.json({ error: 'mealType must be breakfast, lunch, dinner, or snack.' }, { status: 400 });
    }

    const normalizedMealType = mealType && isMealType(mealType) ? mealType : undefined;

    const normalizedItems = rawItems.map((item, index) => {
      const foodName = item.foodName?.trim();

      if (!foodName) {
        throw new Error(`items[${index}].foodName is required.`);
      }

      const quantity = Number(item.quantity ?? 1);
      const calories = Number(item.calories);
      const proteinGrams = Number(item.proteinGrams);
      const carbsGrams = Number(item.carbsGrams);
      const fatGrams = Number(item.fatGrams);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(calories) ||
        !Number.isFinite(proteinGrams) ||
        !Number.isFinite(carbsGrams) ||
        !Number.isFinite(fatGrams)
      ) {
        throw new Error(`items[${index}] has invalid nutrition values.`);
      }

      return {
        catalogFoodId: item.catalogFoodId,
        foodName,
        quantity,
        calories,
        proteinGrams,
        carbsGrams,
        fatGrams,
        sortOrder: item.sortOrder,
      };
    });

    const template = await createMealTemplate(user.id, {
      name,
      mealType: normalizedMealType,
      items: normalizedItems,
    });

    return Response.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create meal template.';
    const status = message.includes('items[') ? 400 : 500;
    console.error('Could not create meal template', error);
    return Response.json({ error: message }, { status });
  }
}
