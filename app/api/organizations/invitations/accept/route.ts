import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { acceptOrganizationInvitation } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return new Response('Invitation token is required', { status: 400 });
    }

    await acceptOrganizationInvitation({
      token: token.trim(),
      userId: session.user.id,
    });

    return new Response('Invitation accepted successfully', { status: 200 });
  } catch (error: any) {
    console.error('Failed to accept invitation:', error);
    return new Response(error.message || 'Failed to accept invitation', {
      status: 500,
    });
  }
}
