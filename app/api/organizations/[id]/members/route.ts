import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getOrganizationMembers,
  createOrganizationInvitation,
  updateOrganizationMemberRole,
  removeOrganizationMember,
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
    const members = await getOrganizationMembers({
      organizationId: id,
      requesterId: session.user.id,
    });

    return Response.json(members);
  } catch (error: any) {
    console.error('Failed to get organization members:', error);
    return new Response(error.message || 'Failed to get organization members', {
      status: 500,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      return new Response('Email is required', { status: 400 });
    }

    if (!role || !['admin', 'member'].includes(role)) {
      return new Response('Valid role is required (admin or member)', {
        status: 400,
      });
    }

    const invitation = await createOrganizationInvitation({
      organizationId: id,
      email: email.trim().toLowerCase(),
      role,
      invitedBy: session.user.id,
    });

    // TODO: Send email invitation with invitation.token
    // This would typically integrate with an email service

    return Response.json({
      message: 'Invitation sent successfully',
      invitationId: invitation.id,
    });
  } catch (error: any) {
    console.error('Failed to invite member:', error);
    return new Response(error.message || 'Failed to invite member', {
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
    const { userId, role, action } = await request.json();

    if (action === 'update_role') {
      if (!userId || !role || !['admin', 'member'].includes(role)) {
        return new Response('Valid userId and role are required', {
          status: 400,
        });
      }

      await updateOrganizationMemberRole({
        organizationId: id,
        userId,
        newRole: role,
        updatedBy: session.user.id,
      });

      return new Response('Member role updated successfully', { status: 200 });
    } else if (action === 'remove_member') {
      if (!userId) {
        return new Response('userId is required', { status: 400 });
      }

      await removeOrganizationMember({
        organizationId: id,
        userId,
        removedBy: session.user.id,
      });

      return new Response('Member removed successfully', { status: 200 });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error: any) {
    console.error('Failed to update member:', error);
    return new Response(error.message || 'Failed to update member', {
      status: 500,
    });
  }
}
