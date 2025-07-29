import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { userRepository, notificationRepository } from "lib/db/repository";
import { NotificationService } from "lib/services/notification-service";
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

    // Find user by email
    const targetUser = await userRepository.findByEmail(email);
    if (!targetUser) {
      return new Response("User with this email does not exist", {
        status: 404,
      });
    }

    // Check if user is already a member of this project
    const existingMembers =
      await pgProjectMemberRepository.getProjectMembers(projectId);
    const existingMember = existingMembers.find(
      (m) => m.user?.id === targetUser.id,
    );

    if (existingMember) {
      return new Response("User is already a member of this project", {
        status: 400,
      });
    }

    // Check for existing pending invitations (check for existing notification)
    const existingNotifications = await notificationRepository.findByUserId(
      targetUser.id,
      50, // limit
      0, // offset
    );

    const existingInvitation = existingNotifications.find(
      (notification) =>
        notification.type === "actionable" &&
        notification.actionStatus === "pending" &&
        notification.payload?.projectId === projectId,
    );

    if (existingInvitation) {
      return new Response("Invitation already sent to this user", {
        status: 400,
      });
    }

    // Get project details
    const project = await pgProjectMemberRepository.getProjectById(projectId);
    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    // Create notification-based invitation instead of direct invitation
    const notification = await NotificationService.createProjectInvitation(
      targetUser.id,
      project.name,
      projectId,
      session.user.id,
      role, // Pass the role from the request
    );

    console.log(
      `Project invitation notification sent to ${email} for project ${project.name}`,
    );

    return Response.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: {
        targetUserId: targetUser.id,
        targetUserEmail: email,
        projectName: project.name,
        role: role,
        notificationId: notification.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request data", { status: 400 });
    }
    console.error("Error sending project invitation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
