"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  useNotificationRealtime,
  useNotificationPolling,
  isSupabaseRealtimeConfigured,
} from "@/hooks/use-notification-realtime";
import { useNotifications } from "@/hooks/use-notifications";
import { authClient } from "auth/client";
import { Notification } from "app-types/notification";

interface NotificationContextType {
  // Connection status
  isRealtimeEnabled: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting" | "polling";
  lastUpdate: Date | null;

  // Notification data and actions - exposed from useNotifications
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markInfoNotificationsAsRead: () => Promise<void>;
  respondToNotification: (
    notificationId: string,
    action: "accept" | "reject",
  ) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session } = authClient.useSession();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<NotificationContextType["connectionStatus"]>("disconnected");

  const isRealtimeConfigured = isSupabaseRealtimeConfigured();
  const userId = session?.user?.id;
  const isEnabled = !!userId;

  // Use the notifications hook to manage state
  const notificationState = useNotifications();

  // Create stable notification actions object using useMemo to prevent recreating on every render
  const notificationActions = useMemo(
    () => ({
      addNotification: notificationState.addNotification,
      updateNotification: notificationState.updateNotification,
      removeNotification: notificationState.removeNotification,
      fetchNotifications: notificationState.fetchNotifications,
      refreshUnreadCount: notificationState.refreshUnreadCount,
    }),
    [
      notificationState.addNotification,
      notificationState.updateNotification,
      notificationState.removeNotification,
      notificationState.fetchNotifications,
      notificationState.refreshUnreadCount,
    ],
  );

  // Use Supabase realtime if available
  const realtimeConnection = useNotificationRealtime({
    userId,
    enabled: isEnabled && isRealtimeConfigured,
    notificationActions,
  });

  // Fallback to polling if Supabase realtime is not configured
  useNotificationPolling({
    userId,
    enabled: isEnabled && !isRealtimeConfigured,
    intervalMs: 15000,
    notificationActions,
  });

  // Update connection status
  useEffect(() => {
    if (!isEnabled) {
      setConnectionStatus("disconnected");
      return;
    }

    if (isRealtimeConfigured) {
      setConnectionStatus(
        realtimeConnection.isConnected ? "connected" : "connecting",
      );
    } else {
      setConnectionStatus("polling");
    }
  }, [isEnabled, isRealtimeConfigured, realtimeConnection.isConnected]);

  // Track last update time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const contextValue: NotificationContextType = {
    // Connection status
    isRealtimeEnabled: isRealtimeConfigured,
    connectionStatus,
    lastUpdate,

    // Notification state and actions
    notifications: notificationState.notifications,
    unreadCount: notificationState.unreadCount,
    loading: notificationState.loading,
    error: notificationState.error,
    fetchNotifications: notificationState.fetchNotifications,
    markAsRead: notificationState.markAsRead,
    markInfoNotificationsAsRead: notificationState.markInfoNotificationsAsRead,
    respondToNotification: notificationState.respondToNotification,
    refreshUnreadCount: notificationState.refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }
  return context;
}

// Optional: Debug component to show connection status
export function NotificationDebugStatus() {
  const { isRealtimeEnabled, connectionStatus, lastUpdate } =
    useNotificationContext();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-2 text-xs text-muted-foreground shadow-lg z-50">
      <div className="space-y-1">
        <div>Mode: {isRealtimeEnabled ? "Supabase Realtime" : "Polling"}</div>
        <div className="flex items-center gap-2">
          Status:
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "polling"
                  ? "bg-blue-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
            }`}
          />
          {connectionStatus}
        </div>
        {lastUpdate && (
          <div>Last update: {lastUpdate.toLocaleTimeString()}</div>
        )}
      </div>
    </div>
  );
}
