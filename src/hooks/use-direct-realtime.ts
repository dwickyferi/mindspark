import { useEffect, useCallback, useRef, useState } from "react";
import { RealtimeClient, RealtimeChannel } from "@supabase/realtime-js";
import { useNotifications } from "./use-notifications";
import {
  getNotificationRealtimeConfig,
  disconnectRealtime,
} from "@/lib/realtime-config";

interface UseDirectRealtimeProps {
  userId?: string;
  enabled?: boolean;
}

interface RealtimeConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  channelState: string | null;
  subscriptionStatus: string | null;
}

export function useDirectRealtime({
  userId,
  enabled = true,
}: UseDirectRealtimeProps) {
  const notificationActions = useNotifications();

  // Connection state
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>({
      isConnected: false,
      isConnecting: false,
      error: null,
      channelState: null,
      subscriptionStatus: null,
    });

  // Refs to store stable references
  const actionsRef = useRef(notificationActions);
  const clientRef = useRef<RealtimeClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Update actions ref when actions change
  actionsRef.current = notificationActions;

  // Create a stable callback for handling realtime notifications
  const handleRealtimeNotification = useCallback((payload: any) => {
    console.log("🔔 [Direct Realtime] Received notification:", payload);

    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const actions = actionsRef.current;

      switch (eventType) {
        case "INSERT":
          if (newRecord) {
            console.log("➕ [Direct] Adding new notification:", newRecord);
            const notification = {
              id: newRecord.id,
              userId: newRecord.user_id,
              type: newRecord.type,
              message: newRecord.message,
              payload: newRecord.payload,
              actionStatus: newRecord.action_status,
              isRead: newRecord.is_read,
              createdAt: new Date(newRecord.created_at),
              updatedAt: new Date(newRecord.updated_at),
            };
            actions.addNotification(notification);
            actions.refreshUnreadCount();
          }
          break;

        case "UPDATE":
          if (newRecord) {
            console.log("🔄 [Direct] Updating notification:", newRecord);
            const notification = {
              id: newRecord.id,
              userId: newRecord.user_id,
              type: newRecord.type,
              message: newRecord.message,
              payload: newRecord.payload,
              actionStatus: newRecord.action_status,
              isRead: newRecord.is_read,
              createdAt: new Date(newRecord.created_at),
              updatedAt: new Date(newRecord.updated_at),
            };
            actions.updateNotification(notification.id, notification);
            actions.refreshUnreadCount();
          }
          break;

        case "DELETE":
          if (oldRecord) {
            console.log("🗑️ [Direct] Removing notification:", oldRecord.id);
            actions.removeNotification(oldRecord.id);
            actions.refreshUnreadCount();
          }
          break;

        default:
          console.log("❓ [Direct] Unknown event type:", eventType);
          actions.fetchNotifications();
          actions.refreshUnreadCount();
      }
    } catch (error) {
      console.error("[Direct Realtime] Error handling notification:", error);
      actionsRef.current.fetchNotifications();
      actionsRef.current.refreshUnreadCount();
    }
  }, []);

  useEffect(() => {
    // Skip if conditions not met
    if (!userId || !enabled) {
      console.log("[Direct Realtime] Skipping setup:", {
        hasUserId: !!userId,
        enabled,
      });
      return;
    }

    console.log("[Direct Realtime] Setting up connection for user:", userId);

    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // Get configuration
      const config = getNotificationRealtimeConfig(userId);

      // Create client
      const client = new RealtimeClient(config.url, {
        params: {
          apikey: config.apikey,
          ...config.params,
        },
      });

      clientRef.current = client;

      // Connect to the server
      client.connect();

      // Create channel for notifications
      const channel = client.channel(`notifications-${userId}`);

      channelRef.current = channel;

      // Set up postgres changes subscription
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: config.schema!,
            table: config.table!,
            filter: config.filter!,
          },
          handleRealtimeNotification,
        )
        .subscribe((status, error) => {
          console.log(
            `[Direct Realtime] Subscription status: ${status}`,
            error,
          );

          setConnectionState((prev) => ({
            ...prev,
            isConnecting: false,
            subscriptionStatus: status,
            channelState: channel.state,
            error: error?.message || null,
          }));

          if (status === "SUBSCRIBED") {
            console.log(
              "✅ [Direct Realtime] Successfully subscribed to notifications",
            );
            setConnectionState((prev) => ({ ...prev, isConnected: true }));
          } else if (status === "CHANNEL_ERROR") {
            console.error(
              "❌ [Direct Realtime] Channel error - subscription failed",
            );
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: error?.message || "Channel error occurred",
            }));
          } else if (status === "TIMED_OUT") {
            console.error("⏰ [Direct Realtime] Subscription timed out");
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: "Subscription timed out",
            }));
          } else if (status === "CLOSED") {
            console.log("🔒 [Direct Realtime] Channel closed");
            setConnectionState((prev) => ({ ...prev, isConnected: false }));
          }
        });

      // Test connection after a delay
      setTimeout(() => {
        console.log("[Direct Realtime] Connection test:", {
          clientState: client.connectionState(),
          channelState: channel.state,
          channelsCount: client.channels.length,
        });
      }, 3000);
    } catch (error) {
      console.error("[Direct Realtime] Setup error:", error);
      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown setup error",
      }));
    }

    // Cleanup function
    return () => {
      console.log("[Direct Realtime] Cleaning up connection");

      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }

      setConnectionState({
        isConnected: false,
        isConnecting: false,
        error: null,
        channelState: null,
        subscriptionStatus: null,
      });
    };
  }, [userId, enabled, handleRealtimeNotification]);

  // Manual reconnection function
  const reconnect = useCallback(() => {
    if (clientRef.current && channelRef.current) {
      console.log("[Direct Realtime] Manual reconnection triggered");

      // Unsubscribe current channel
      channelRef.current.unsubscribe();

      // Reconnect
      clientRef.current.connect();

      // Resubscribe
      channelRef.current.subscribe();
    }
  }, []);

  return {
    ...connectionState,
    isEnabled: enabled && !!userId,
    reconnect,
    debug: {
      clientState: clientRef.current?.connectionState(),
      channelState: channelRef.current?.state,
      channelsCount: clientRef.current?.channels.length || 0,
    },
  };
}

// Helper function to check if direct realtime is configured
export function isDirectRealtimeConfigured(): boolean {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return !!(supabaseUrl && supabaseKey);
  } catch {
    return false;
  }
}

// Global cleanup function
export function cleanupDirectRealtime() {
  disconnectRealtime();
}
