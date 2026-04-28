import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { createFoodCatalogItem, searchFoodCatalog } from '@/lib/workouts/food-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    const result = await searchFoodCatalog(user.id, query, page, pageSize);
    return Response.json(result);
  } catch (error) {
    console.error('Could not search food catalog', error);
    return Response.json({ error: 'Could not search food catalog.' }, { status: 500 });
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
      brand?: string | null;
      barcode?: string | null;
      servingLabel?: string;
      servingQuantity?: number;
      calories?: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
    };

    const name = body.name?.trim();

    if (!name) {
      return Response.json({ error: 'name is required.' }, { status: 400 });
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
      return Response.json({ error: 'Macro and calorie values are required.' }, { status: 400 });
    }

    const food = await createFoodCatalogItem({
      userId: user.id,
      name,
      brand: body.brand,
      barcode: body.barcode,
      servingLabel: body.servingLabel,
      servingQuantity: Number(body.servingQuantity ?? 1),
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    });

    return Response.json({ food }, { status: 201 });
  } catch (error) {
    console.error('Could not create food catalog item', error);
    return Response.json({ error: 'Could not create food catalog item.' }, { status: 500 });
  }
}
