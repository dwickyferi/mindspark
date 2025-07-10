import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { setActiveOrganization } from '@/lib/db/queries';

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { organizationId } = await request.json();

    await setActiveOrganization({
      userId: session.user.id,
      organizationId: organizationId || null,
    });

    return new Response('Active organization updated', { status: 200 });
  } catch (error: any) {
    console.error('Failed to switch organization:', error);
    return new Response(error.message || 'Failed to switch organization', {
      status: 500,
    });
  }
}
