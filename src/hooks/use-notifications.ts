import { useState, useEffect, useCallback } from "react";
import { Notification } from "app-types/notification";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  respondToNotification: (
    notificationId: string,
    action: "accept" | "reject",
  ) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
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
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      const data = await response.json();

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notificationIds.includes(notif.id)
            ? { ...notif, isRead: true }
            : notif,
        ),
      );

      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  }, []);

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

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    respondToNotification,
    refreshUnreadCount,
  };
}
