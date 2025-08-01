import { getSessionForApi } from "auth/server";
import { notificationRepository } from "lib/db/repository";
import { NextResponse } from "next/server";
import {
  NotificationCreateInputZodSchema,
  MarkAsReadZodSchema,
} from "app-types/notification";

export async function GET(request: Request) {
  try {
    const session = await getSessionForApi();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread_only") === "true";

    if (unreadOnly) {
      // Return only unread count for badge
      const unreadCount = await notificationRepository.getUnreadCount(
        session.user.id,
      );
      return NextResponse.json({ unreadCount });
    }

    const notifications = await notificationRepository.findByUserId(
      session.user.id,
      limit,
      offset,
    );

    const unreadCount = await notificationRepository.getUnreadCount(
      session.user.id,
    );

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    });
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionForApi();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const input = NotificationCreateInputZodSchema.parse(json);

    // Ensure the notification is being created for the authenticated user
    if (input.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await notificationRepository.create(input);

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionForApi();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { notificationIds } = MarkAsReadZodSchema.parse(json);

    // Verify all notifications belong to the authenticated user and validate read logic
    const validNotificationIds: string[] = [];

    for (const id of notificationIds) {
      const notification = await notificationRepository.findById(id);

      if (!notification || notification.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Allow most notification types to be marked as read directly
      // Only actionable notifications with pending status require action first
      if (
        notification.type === "actionable" &&
        notification.actionStatus === "pending"
      ) {
        // Skip actionable notifications that are still pending - they should only be
        // marked as read when the user takes action (accept/reject)
        console.log(`Skipping pending actionable notification: ${id}`);
      } else {
        // Allow all other notification types (info, test, etc.) and
        // actionable notifications that have been responded to
        validNotificationIds.push(id);
        console.log(
          `Adding notification to mark as read: ${id} (type: ${notification.type})`,
        );
      }
    }

    if (validNotificationIds.length > 0) {
      await notificationRepository.markAsRead(validNotificationIds);
    }

    const unreadCount = await notificationRepository.getUnreadCount(
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      unreadCount,
      markedCount: validNotificationIds.length,
      message:
        validNotificationIds.length < notificationIds.length
          ? "Some notifications require user action before they can be marked as read"
          : undefined,
    });
  } catch (error: any) {
    console.error("Failed to mark notifications as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notifications as read" },
      { status: 500 },
    );
  }
}
