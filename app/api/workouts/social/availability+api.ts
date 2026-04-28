import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api/require-auth';
import { getAvailability, updateAvailability } from '@/lib/workouts/social-server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const availability = await getAvailability(user.id);
    return Response.json(availability);
  } catch (error) {
    console.error('Could not load availability', error);
    return Response.json({ error: 'Could not load availability.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as {
      recurringSlots?: Array<{
        dayOfWeek: number;
        startMinute: number;
        endMinute: number;
        isActive?: boolean;
      }>;
      oneOffSlots?: Array<{
        startsAt: string;
        endsAt: string;
        status?: 'available' | 'busy';
      }>;
    };

    const availability = await updateAvailability(user.id, {
      recurringSlots: Array.isArray(body.recurringSlots) ? body.recurringSlots : [],
      oneOffSlots: Array.isArray(body.oneOffSlots) ? body.oneOffSlots : [],
    });

    return Response.json(availability);
  } catch (error) {
    console.error('Could not save availability', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not save availability.' },
      { status: 400 }
    );
  }
}
