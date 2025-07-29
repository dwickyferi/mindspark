import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { AcceptInviteRequestSchema } from "app-types/project-member";
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

    // Parse request body
    const body = await request.json();
    const { token } = AcceptInviteRequestSchema.parse(body);

    // Get invitation details
    const invitation =
      await pgProjectMemberRepository.getInvitationByToken(token);

    if (!invitation) {
      return new Response("Invalid invitation token", { status: 400 });
    }

    if (invitation.projectId !== projectId) {
      return new Response("Invalid invitation for this project", {
        status: 400,
      });
    }

    if (invitation.acceptedAt) {
      return new Response("Invitation has already been accepted", {
        status: 400,
      });
    }

    if (invitation.expiresAt < new Date()) {
      return new Response("Invitation has expired", { status: 400 });
    }

    // TODO: Verify the user's email matches the invitation email
    // This would require getting the user's email from the session
    // For now, we'll allow any authenticated user to accept

    // Accept the invitation
    const member = await pgProjectMemberRepository.acceptInvitation(
      token,
      session.user.id,
    );

    return Response.json({
      success: true,
      member: {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request data", { status: 400 });
    }

    if (
      error instanceof Error &&
      error.message.includes("Invalid or already accepted")
    ) {
      return new Response(error.message, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("expired")) {
      return new Response(error.message, { status: 400 });
    }

    console.error("Error accepting invitation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
