import { useState, useEffect, useCallback } from "react";
import { Notification } from "app-types/notification";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markInfoNotificationsAsRead: () => Promise<void>;
  markNonActionableNotificationsAsRead: () => Promise<void>;
  respondToNotification: (
    notificationId: string,
    action: "accept" | "reject",
  ) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  // New methods for real-time updates
  addNotification: (notification: Notification) => void;
  updateNotification: (
    notificationId: string,
    updates: Partial<Notification>,
  ) => void;
  removeNotification: (notificationId: string) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/notifications");

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?unread_only=true");

      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }

      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to refresh unread count:", err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      console.log("🔔 markAsRead called with IDs:", notificationIds);

      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds }),
      });

      console.log("🔔 markAsRead API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔔 markAsRead API error:", errorText);
        throw new Error("Failed to mark notifications as read");
      }

      const data = await response.json();
      console.log("🔔 markAsRead API response data:", data);

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notificationIds.includes(notif.id)
            ? { ...notif, isRead: true }
            : notif,
        ),
      );

      setUnreadCount(data.unreadCount || 0);
      console.log("🔔 Updated unread count to:", data.unreadCount || 0);
    } catch (err) {
      console.error("🔔 markAsRead error:", err);
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  }, []);

  const markInfoNotificationsAsRead = useCallback(async () => {
    // Find all unread informational notifications
    const infoNotificationIds = notifications
      .filter((notif) => !notif.isRead && notif.type === "info")
      .map((notif) => notif.id);

    if (infoNotificationIds.length > 0) {
      await markAsRead(infoNotificationIds);
    }
  }, [notifications, markAsRead]);

  const markNonActionableNotificationsAsRead = useCallback(async () => {
    // Find all unread notifications that don't require user action
    // (all types except actionable notifications with pending status)
    const nonActionableNotificationIds = notifications
      .filter((notif) => 
        !notif.isRead && 
        !(notif.type === "actionable" && notif.actionStatus === "pending")
      )
      .map((notif) => notif.id);

    console.log("🔔 Auto-marking non-actionable notifications as read:", nonActionableNotificationIds);

    if (nonActionableNotificationIds.length > 0) {
      await markAsRead(nonActionableNotificationIds);
    }
  }, [notifications, markAsRead]);

  const respondToNotification = useCallback(
    async (notificationId: string, action: "accept" | "reject") => {
      try {
        const response = await fetch("/api/notifications/respond", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId, action }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to respond to notification",
          );
        }

        const data = await response.json();

        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? data.notification : notif,
          ),
        );

        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to respond to notification",
        );
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time update methods
  const addNotification = useCallback((notification: Notification) => {
    console.log("🔔 Adding notification to state:", notification.id);

    setNotifications((prev) => {
      // Check if notification already exists to prevent duplicates
      const exists = prev.find((n) => n.id === notification.id);
      if (exists) {
        console.log(
          "⚠️ Notification already exists, skipping:",
          notification.id,
        );
        return prev;
      }

      console.log(`➕ Adding new notification. Previous count: ${prev.length}`);
      return [notification, ...prev];
    });

    if (!notification.isRead) {
      setUnreadCount((prev) => {
        console.log(`📊 Updating unread count: ${prev} → ${prev + 1}`);
        return prev + 1;
      });
    }
  }, []);

  const updateNotification = useCallback(
    (notificationId: string, updates: Partial<Notification>) => {
      console.log("🔄 Updating notification:", notificationId, updates);

      setNotifications((prev) => {
        const updated = prev.map((notif) =>
          notif.id === notificationId ? { ...notif, ...updates } : notif,
        );
        console.log(`📝 Updated notification list. Count: ${updated.length}`);
        return updated;
      });

      // Update unread count if read status changed
      if (updates.isRead !== undefined) {
        const notification = notifications.find((n) => n.id === notificationId);
        const wasUnread = notification?.isRead === false;

        if (wasUnread && updates.isRead) {
          setUnreadCount((prev) => {
            const newCount = Math.max(0, prev - 1);
            console.log(
              `📊 Marking as read - unread count: ${prev} → ${newCount}`,
            );
            return newCount;
          });
        } else if (!wasUnread && !updates.isRead) {
          setUnreadCount((prev) => {
            const newCount = prev + 1;
            console.log(
              `📊 Marking as unread - unread count: ${prev} → ${newCount}`,
            );
            return newCount;
          });
        }
      }
    },
    [notifications],
  );

  const removeNotification = useCallback((notificationId: string) => {
    console.log("🗑️ Removing notification from state:", notificationId);

    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      const filtered = prev.filter((notif) => notif.id !== notificationId);

      console.log(
        `🔥 Removed notification. Count: ${prev.length} → ${filtered.length}`,
      );

      // Update unread count if removed notification was unread
      if (notification && !notification.isRead) {
        setUnreadCount((count) => {
          const newCount = Math.max(0, count - 1);
          console.log(
            `📊 Removing unread notification - count: ${count} → ${newCount}`,
          );
          return newCount;
        });
      }

      return filtered;
    });
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markInfoNotificationsAsRead,
    markNonActionableNotificationsAsRead,
    respondToNotification,
    refreshUnreadCount,
    addNotification,
    updateNotification,
    removeNotification,
  };
}
