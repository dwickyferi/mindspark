import { getSession } from "auth/server";
import {
  notificationRepository,
  projectMemberRepository,
} from "lib/db/repository";
import { NextResponse } from "next/server";
import { NotificationResponseZodSchema } from "app-types/notification";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { notificationId, action } =
      NotificationResponseZodSchema.parse(json);

    // Find the notification and verify ownership
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (notification.type !== "actionable") {
      return NextResponse.json(
        {
          error: "Cannot respond to non-actionable notification",
        },
        { status: 400 },
      );
    }

    if (notification.actionStatus !== "pending") {
      return NextResponse.json(
        {
          error: "Notification has already been responded to",
        },
        { status: 400 },
      );
    }

    // Update notification status
    const updatedNotification = await notificationRepository.update(
      notificationId,
      {
        actionStatus: action === "accept" ? "accepted" : "rejected",
        isRead: true,
      },
    );

    // Handle side effects based on notification type and payload
    if (notification.payload) {
      await handleNotificationResponse(notification, action, session.user.id);
    }

    const unreadCount = await notificationRepository.getUnreadCount(
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Failed to respond to notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to notification" },
      { status: 500 },
    );
  }
}

async function handleNotificationResponse(
  notification: any,
  action: "accept" | "reject",
  userId: string,
) {
  // Handle project invitation responses
  if (notification.payload?.projectId) {
    if (action === "accept") {
      try {
        // Use the role from the notification payload, default to "member" if not specified
        const role = notification.payload.role || "member";

        // Add user to project with the specified role
        await projectMemberRepository.addProjectMember(
          notification.payload.projectId,
          userId,
          role,
          notification.payload.invitedBy,
        );

        console.log(
          `User ${userId} accepted invitation to project ${notification.payload.projectId} as ${role}`,
        );
      } catch (error) {
        console.error("Failed to add user to project:", error);
        // You might want to revert the notification status here
        throw new Error("Failed to process project invitation acceptance");
      }
    } else {
      console.log(
        `User ${userId} rejected invitation to project ${notification.payload.projectId}`,
      );
    }
  }

  // Add other notification response handlers here as needed
  // For example: document sharing, collaboration requests, etc.
}
