import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createOrganization,
  getOrganizationsByUserId,
  deleteOrganization,
  setActiveOrganization,
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== 'string') {
      return new Response('Organization name is required', { status: 400 });
    }

    const organization = await createOrganization({
      name: name.trim(),
      description: description?.trim(),
      ownerId: session.user.id,
    });

    return Response.json(organization);
  } catch (error: any) {
    console.error('Failed to create organization:', error);
    return new Response(error.message || 'Failed to create organization', {
      status: 500,
    });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const organizations = await getOrganizationsByUserId({
      userId: session.user.id,
    });

    return Response.json(organizations);
  } catch (error: any) {
    console.error('Failed to get organizations:', error);
    return new Response(error.message || 'Failed to get organizations', {
      status: 500,
    });
  }
}
