import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { z } from "zod";

const RemoveMemberRequestSchema = z.object({
  userId: z.string().uuid(),
});

export async function DELETE(
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
    const { userId } = RemoveMemberRequestSchema.parse(body);

    // Get current user's role and target user's role
    const currentUserRole = await pgProjectMemberRepository.getMemberRole(
      projectId,
      session.user.id,
    );
    const targetUserRole = await pgProjectMemberRepository.getMemberRole(
      projectId,
      userId,
    );

    if (!targetUserRole) {
      return new Response("User is not a member of this project", {
        status: 400,
      });
    }

    // Cannot remove owner
    if (targetUserRole === "owner") {
      return new Response("Cannot remove project owner", { status: 400 });
    }

    // Only owners can remove admins
    if (targetUserRole === "admin" && currentUserRole !== "owner") {
      return new Response("Only project owners can remove admin members", {
        status: 403,
      });
    }

    // Cannot remove yourself unless you're the owner
    if (userId === session.user.id && currentUserRole !== "owner") {
      return new Response("Cannot remove yourself from the project", {
        status: 400,
      });
    }

    // Remove the member
    await pgProjectMemberRepository.removeMember(projectId, userId);

    return Response.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request data", { status: 400 });
    }
    console.error("Error removing member:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
