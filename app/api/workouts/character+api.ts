import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { normalizeCharacterSelection } from '@/lib/workouts/character';
import { updateUserCharacterSelection } from '@/lib/workouts/server';

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json().catch(() => null);
    const selection = normalizeCharacterSelection(body);
    const gamification = await updateUserCharacterSelection(user.id, selection);

    return Response.json({ gamification });
  } catch (error) {
    console.error('Could not update character selection', error);
    return Response.json({ error: 'Could not update character selection.' }, { status: 500 });
  }
}
