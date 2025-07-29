/**
 * Example usage of the notification system
 * This file demonstrates how to integrate notifications into your application
 */

import { NotificationService } from "lib/services/notification-service";

// Example: Creating notifications when a user is invited to a project
export async function inviteUserToProject(
  projectId: string,
  projectName: string,
  invitedUserId: string,
  invitingUserId: string,
  invitationId?: string,
) {
  try {
    // Create the invitation notification
    const notification = await NotificationService.createProjectInvitation(
      invitedUserId,
      projectName,
      projectId,
      invitingUserId,
      invitationId,
    );

    console.log("Project invitation notification created:", notification.id);

    // In a real application with WebSocket/SSE, you would emit the notification here
    // emitNotificationUpdate(invitedUserId, notification);

    return notification;
  } catch (error) {
    console.error("Failed to create invitation notification:", error);
    throw error;
  }
}

// Example: Creating notifications for file uploads
export async function notifyFileUploadSuccess(
  userId: string,
  fileName: string,
  projectId?: string,
) {
  try {
    const notification = await NotificationService.createFileUploadSuccess(
      userId,
      fileName,
      projectId,
    );

    console.log("File upload notification created:", notification.id);
    return notification;
  } catch (error) {
    console.error("Failed to create file upload notification:", error);
    throw error;
  }
}

// Example: Integration with existing project member system
export async function handleProjectInvitationResponse(
  notificationId: string,
  action: "accept" | "reject",
  userId: string,
) {
  try {
    // The API endpoint will handle the logic
    const response = await fetch("/api/notifications/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId,
        action,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to respond to invitation");
    }

    const result = await response.json();
    console.log("Invitation response processed:", result);

    return result;
  } catch (error) {
    console.error("Failed to process invitation response:", error);
    throw error;
  }
}

// Example: Batch create notifications for multiple users
export async function notifyMultipleUsers(
  userIds: string[],
  message: string,
  payload?: any,
) {
  const notifications = await Promise.allSettled(
    userIds.map((userId) =>
      NotificationService.createNotification(userId, "info", message, payload),
    ),
  );

  const successful = notifications.filter(
    (result) => result.status === "fulfilled",
  ).length;

  console.log(`Created ${successful}/${userIds.length} notifications`);

  return notifications;
}

// Example: Integration in a Next.js API route
export async function apiRouteExample(req: any, res: any) {
  try {
    // Example: When a document is processed
    const { userId, documentName, projectId } = req.body;

    const notification = await NotificationService.createDocumentProcessed(
      userId,
      documentName,
      projectId,
    );

    // Send response
    res.status(200).json({
      success: true,
      notificationId: notification.id,
    });

    // In a real-time setup, emit the update
    // req.io?.to(`user_${userId}`).emit('notification_update', notification);
  } catch (error) {
    console.error("API route error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create notification",
    });
  }
}

// Example: React component integration
export function ExampleComponent() {
  // This would be in a React component
  /*
  import { useNotifications } from '@/hooks/use-notifications';
  import { useNotificationRealtime } from '@/hooks/use-notification-simple-realtime';
  import { NotificationButton } from '@/components/notification-button';

  function MyComponent() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    
    // Enable real-time updates
    useNotificationRealtime({ 
      userId: 'current-user-id',
      enabled: true 
    });

    return (
      <div>
        <NotificationButton />
        
        // Or custom notification display
        <div>
          <h3>Notifications ({unreadCount})</h3>
          {notifications.map(notification => (
            <div key={notification.id}>
              {notification.message}
              {!notification.isRead && (
                <button onClick={() => markAsRead([notification.id])}>
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  */
}

// Example environment variables needed for Supabase (optional)
/*
// .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

// For WebSocket real-time (future implementation)
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/api/notifications/ws
*/
