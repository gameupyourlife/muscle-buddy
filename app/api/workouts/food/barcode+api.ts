import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { lookupFoodByBarcode } from '@/lib/workouts/food-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const barcode = url.searchParams.get('barcode')?.trim() ?? '';

    if (!barcode) {
      return Response.json({ error: 'barcode is required.' }, { status: 400 });
    }

    const result = await lookupFoodByBarcode(user.id, barcode);

    if (!result) {
      return Response.json({ result: null });
    }

    return Response.json({ result });
  } catch (error) {
    console.error('Could not look up barcode', error);
    return Response.json({ error: 'Could not look up barcode.' }, { status: 500 });
  }
}
