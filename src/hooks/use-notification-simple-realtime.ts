import { useEffect, useCallback } from "react";
import { useNotifications } from "./use-notifications";

interface UseNotificationRealtimeProps {
  userId?: string;
  enabled?: boolean;
}

/**
 * Lightweight real-time notification hook using polling
 * Can be extended to use WebSockets or SSE in the future
 */
export function useNotificationRealtime({
  userId,
  enabled = true,
}: UseNotificationRealtimeProps) {
  const { refreshUnreadCount } = useNotifications();

  // Polling approach for real-time updates
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    console.log("Setting up notification polling for user:", userId);

    // Poll for unread count updates every 30 seconds
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    // Also poll when the window comes back into focus
    const handleFocus = () => {
      refreshUnreadCount();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, enabled, refreshUnreadCount]);

  return {
    isConnected: enabled && !!userId,
    isEnabled: enabled && !!userId,
  };
}

/**
 * Enhanced notification hook that can be upgraded to use WebSockets
 */
export function useWebSocketNotifications({
  userId,
  enabled = true,
}: UseNotificationRealtimeProps) {
  const { fetchNotifications, refreshUnreadCount } = useNotifications();

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "notification_update" && data.userId === userId) {
          console.log("Received notification update via WebSocket");
          fetchNotifications();
          refreshUnreadCount();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [userId, fetchNotifications, refreshUnreadCount],
  );

  useEffect(() => {
    // For now, this is just a placeholder
    // You can implement WebSocket connection here when needed
    if (!enabled || !userId) {
      return;
    }

    // TODO: Implement WebSocket connection
    // const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${userId}`);
    // ws.addEventListener('message', handleWebSocketMessage);
    //
    // return () => {
    //   ws.close();
    // };

    console.log(
      "WebSocket notifications not implemented yet, falling back to polling",
    );

    // Fallback to polling for now
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, enabled, refreshUnreadCount, handleWebSocketMessage]);

  return {
    isConnected: false, // Will be true when WebSocket is implemented
    isEnabled: enabled && !!userId,
  };
}
