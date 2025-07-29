import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { InviteMemberRequestSchema } from "app-types/project-member";
import { z } from "zod";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { projectId } = await params;

    // Check if user can manage members (owner or admin)
    const canManage = await pgProjectMemberRepository.canManageMembers(
      projectId,
      session.user.id,
    );

    if (!canManage) {
      return new Response("Forbidden - Insufficient permissions", {
        status: 403,
      });
    }

    // Parse request body
    const body = await request.json();
    const { email, role } = InviteMemberRequestSchema.parse(body);

    // TODO: Check if user with this email already exists in the project
    const existingMembers =
      await pgProjectMemberRepository.getProjectMembers(projectId);
    const existingMember = existingMembers.find((m) => m.user?.email === email);

    if (existingMember) {
      return new Response("User is already a member of this project", {
        status: 400,
      });
    }

    // TODO: Check for existing pending invitation
    const pendingInvitations =
      await pgProjectMemberRepository.getPendingInvitations(projectId);
    const existingInvitation = pendingInvitations.find(
      (inv) => inv.email === email,
    );

    if (existingInvitation) {
      return new Response("Invitation already sent to this email", {
        status: 400,
      });
    }

    // Create invitation
    const invitation = await pgProjectMemberRepository.createInvitation(
      projectId,
      email,
      role,
      session.user.id,
    );

    // TODO: Send email notification
    // For now, we'll just return the invitation details
    // In a real implementation, you'd integrate with an email service here
    console.log(
      `Invitation created for ${email} to join project ${projectId} as ${role}`,
    );
    console.log(
      `Invitation link: ${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/projects/${projectId}/invite?token=${invitation.token}`,
    );

    return Response.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteLink: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/projects/${projectId}/invite?token=${invitation.token}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request data", { status: 400 });
    }
    console.error("Error inviting member:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
