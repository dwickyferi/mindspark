import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { ChangeRoleRequestSchema } from "app-types/project-member";
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
    const { userId, role } = ChangeRoleRequestSchema.parse(body);

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

    // Cannot change owner role
    if (targetUserRole === "owner") {
      return new Response("Cannot change owner role", { status: 400 });
    }

    // Only owners can promote to admin
    if (role === "admin" && currentUserRole !== "owner") {
      return new Response("Only project owners can promote members to admin", {
        status: 403,
      });
    }

    // Cannot change your own role unless you're the owner
    if (userId === session.user.id && currentUserRole !== "owner") {
      return new Response("Cannot change your own role", { status: 400 });
    }

    // Update the role
    const updatedMember = await pgProjectMemberRepository.updateMemberRole(
      projectId,
      userId,
      role,
    );

    return Response.json({
      success: true,
      member: updatedMember,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request data", { status: 400 });
    }
    console.error("Error changing member role:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
