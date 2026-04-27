import { auth } from '@/lib/auth';

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export async function getAuthenticatedUser(request: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  console.log('Session data:', session);
  
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
