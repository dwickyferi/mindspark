import { getSessionForApi } from "auth/server";
import { userRepository } from "lib/db/repository";
import { NotificationService } from "lib/services/notification-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionForApi();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      targetEmail,
      projectName = "Test Project",
      role = "member",
    } = await request.json();

    // Find target user
    const targetUser = await userRepository.findByEmail(targetEmail);
    if (!targetUser) {
      return new Response("User not found", { status: 404 });
    }

    // Create test project invitation notification
    const notification = await NotificationService.createProjectInvitation(
      targetUser.id,
      projectName,
      "test-project-id",
      session.user.id,
      role,
    );

    return Response.json({
      success: true,
      message: "Test project invitation notification created",
      notification,
    });
  } catch (error) {
    console.error("Error creating test notification:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
