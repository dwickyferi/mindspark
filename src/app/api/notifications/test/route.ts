/**
 * Test API endpoint for creating sample notifications
 * This is for development/testing purposes only
 * Should be removed or secured in production
 */

import { getSession } from "auth/server";
import { NotificationService } from "lib/services/notification-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await request.json();
    const userId = session.user.id;

    let notification;

    switch (type) {
      case "project_invitation":
        notification = await NotificationService.createProjectInvitation(
          userId,
          "Test Project",
          "test-project-id",
          "test-inviter-id",
          "test-invitation-id",
        );
        break;

      case "file_upload":
        notification = await NotificationService.createFileUploadSuccess(
          userId,
          "test-document.pdf",
          "test-project-id",
        );
        break;

      case "document_processed":
        notification = await NotificationService.createDocumentProcessed(
          userId,
          "Research Paper.pdf",
          "test-project-id",
        );
        break;

      case "workflow_completed":
        notification = await NotificationService.createWorkflowCompleted(
          userId,
          "Data Analysis Workflow",
          "test-workflow-id",
          true,
        );
        break;

      case "workflow_failed":
        notification = await NotificationService.createWorkflowCompleted(
          userId,
          "Image Processing Workflow",
          "test-workflow-id-2",
          false,
        );
        break;

      case "role_updated":
        notification = await NotificationService.createProjectRoleUpdated(
          userId,
          "Marketing Project",
          "admin",
          "test-admin-id",
        );
        break;

      default:
        notification = await NotificationService.createNotification(
          userId,
          "info",
          "This is a test notification created for development purposes.",
          { testData: true, timestamp: new Date().toISOString() },
        );
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        actionStatus: notification.actionStatus,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to create test notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test notification" },
      { status: 500 },
    );
  }
}

// Get endpoint to show available test types
export async function GET() {
  return NextResponse.json({
    available_types: [
      "project_invitation",
      "file_upload",
      "document_processed",
      "workflow_completed",
      "workflow_failed",
      "role_updated",
      "default",
    ],
    usage: {
      method: "POST",
      body: {
        type: "project_invitation", // or any other type
      },
    },
    note: "This endpoint is for testing purposes only",
  });
}
