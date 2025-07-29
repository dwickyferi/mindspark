import { notificationRepository } from "lib/db/repository";
import {
  NotificationCreateInput,
  NotificationType,
  NotificationPayload,
} from "app-types/notification";

/**
 * Helper functions to create common notification types
 */
export class NotificationService {
  /**
   * Create a project invitation notification
   */
  static async createProjectInvitation(
    userId: string,
    projectName: string,
    projectId: string,
    invitedBy: string,
    role: string = "member",
    invitationId?: string,
  ) {
    const input: NotificationCreateInput = {
      userId,
      type: "actionable",
      message: `You have been invited to join the project "${projectName}".`,
      payload: {
        projectId,
        projectName,
        invitedBy,
        role,
        invitationId,
      },
      actionStatus: "pending",
    };

    return await notificationRepository.create(input);
  }

  /**
   * Create a file upload success notification
   */
  static async createFileUploadSuccess(
    userId: string,
    fileName: string,
    projectId?: string,
  ) {
    const input: NotificationCreateInput = {
      userId,
      type: "info",
      message: `Your file "${fileName}" has been uploaded successfully.`,
      payload: {
        fileName,
        projectId,
      },
    };

    return await notificationRepository.create(input);
  }

  /**
   * Create a document processing notification
   */
  static async createDocumentProcessed(
    userId: string,
    documentName: string,
    projectId?: string,
  ) {
    const input: NotificationCreateInput = {
      userId,
      type: "info",
      message: `Document "${documentName}" has been processed and is ready for use.`,
      payload: {
        documentName,
        projectId,
      },
    };

    return await notificationRepository.create(input);
  }

  /**
   * Create a project role updated notification
   */
  static async createProjectRoleUpdated(
    userId: string,
    projectName: string,
    newRole: string,
    updatedBy: string,
  ) {
    const input: NotificationCreateInput = {
      userId,
      type: "info",
      message: `Your role in project "${projectName}" has been updated to ${newRole}.`,
      payload: {
        projectName,
        newRole,
        updatedBy,
      },
    };

    return await notificationRepository.create(input);
  }

  /**
   * Create a workflow completion notification
   */
  static async createWorkflowCompleted(
    userId: string,
    workflowName: string,
    workflowId: string,
    success: boolean,
  ) {
    const message = success
      ? `Workflow "${workflowName}" has completed successfully.`
      : `Workflow "${workflowName}" has failed. Please check the logs.`;

    const input: NotificationCreateInput = {
      userId,
      type: "info",
      message,
      payload: {
        workflowName,
        workflowId,
        success,
      },
    };

    return await notificationRepository.create(input);
  }

  /**
   * Generic notification creation method
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    payload?: NotificationPayload,
    actionStatus?: "pending" | "accepted" | "rejected",
  ) {
    const input: NotificationCreateInput = {
      userId,
      type,
      message,
      payload,
      actionStatus,
    };

    return await notificationRepository.create(input);
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await notificationRepository.getUnreadCount(userId);
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(notificationIds: string[]): Promise<void> {
    return await notificationRepository.markAsRead(notificationIds);
  }
}
