import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getOrganizationById,
  deleteOrganization,
  setActiveOrganization,
  updateOrganization,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const organization = await getOrganizationById({
      id,
      userId: session.user.id,
    });

    if (!organization) {
      return new Response('Organization not found', { status: 404 });
    }

    return Response.json(organization);
  } catch (error: any) {
    console.error('Failed to get organization:', error);
    return new Response(error.message || 'Failed to get organization', {
      status: 500,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteOrganization({
      organizationId: id,
      userId: session.user.id,
    });

    return new Response('Organization deleted successfully', { status: 200 });
  } catch (error: any) {
    console.error('Failed to delete organization:', error);
    return new Response(error.message || 'Failed to delete organization', {
      status: 500,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const { action, name, description } = await request.json();

    if (action === 'set_active') {
      await setActiveOrganization({
        userId: session.user.id,
        organizationId: id,
      });

      return new Response('Active organization updated', { status: 200 });
    }

    if (action === 'update_details') {
      if (!name || !name.trim()) {
        return new Response('Organization name is required', { status: 400 });
      }

      const updatedOrg = await updateOrganization({
        id,
        name: name.trim(),
        description: description?.trim() || undefined,
        userId: session.user.id,
      });

      return Response.json(updatedOrg);
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error: any) {
    console.error('Failed to update organization:', error);
    return new Response(error.message || 'Failed to update organization', {
      status: 500,
    });
  }
}
