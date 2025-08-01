import { useEffect, useCallback, useRef, useState } from "react";
import { Notification } from "app-types/notification";
import { supabase } from "@/lib/supabase";
import { useDirectRealtime } from "./use-direct-realtime";

interface UseNotificationRealtimeProps {
  userId?: string;
  enabled?: boolean;
  useDirectLibrary?: boolean;
  // New props to accept notification actions from provider
  notificationActions?: {
    addNotification: (notification: Notification) => void;
    updateNotification: (
      notificationId: string,
      updates: Partial<Notification>,
    ) => void;
    removeNotification: (notificationId: string) => void;
    fetchNotifications: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
  };
}

interface ConnectionState {
  isConnected: boolean;
  isEnabled: boolean;
  error?: string;
  channelState?: string;
  subscriptionStatus?: string;
  lastError?: any;
  reconnectAttempts?: number;
  usingPolling?: boolean; // New flag to indicate if we're using polling fallback
}

export function useNotificationRealtime({
  userId,
  enabled = true,
  useDirectLibrary = false,
  notificationActions,
}: UseNotificationRealtimeProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isEnabled: enabled && !!userId,
    reconnectAttempts: 0,
  });

  // Use direct library if requested
  const directRealtimeResult = useDirectRealtime({
    userId,
    enabled: enabled && useDirectLibrary,
  });

  // Always create refs and callbacks, even if we might not use them
  const actionsRef = useRef(notificationActions);
  actionsRef.current = notificationActions;

  // Polling fallback for when realtime fails
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPollingFallback = useCallback(() => {
    if (!notificationActions) return;

    console.log("🔄 Starting polling fallback for notifications");

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      console.log("📮 Polling for notification updates");
      notificationActions.fetchNotifications();
      notificationActions.refreshUnreadCount();
    }, 10000);
  }, [notificationActions]);

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log("⏹️ Stopping polling fallback");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Create a stable callback that doesn't change on every render
  const handleRealtimeNotification = useCallback(
    (payload: any) => {
      if (!notificationActions) return;

      console.log("🔔 Received realtime notification:", payload);
      console.log("🔍 Current userId:", userId);
      console.log("🔍 Event details:", {
        eventType: payload.eventType,
        newRecord: payload.new,
        oldRecord: payload.old,
        table: payload.table,
        schema: payload.schema,
      });

      try {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const actions = actionsRef.current;

        if (!actions) return;

        // Verify the event is for the current user
        const recordUserId = newRecord?.user_id || oldRecord?.user_id;
        if (recordUserId && recordUserId !== userId) {
          console.log(
            `⚠️ Ignoring notification for different user: ${recordUserId} (current: ${userId})`,
          );
          return;
        }

        console.log(`✅ Processing ${eventType} event for user ${userId}`);

        switch (eventType) {
          case "INSERT":
            // New notification received - add to local state
            if (newRecord) {
              console.log("➕ Adding new notification:", newRecord);
              // Transform database record to notification format
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
              console.log("🚀 Calling addNotification with:", notification);
              actions.addNotification(notification);
              actions.refreshUnreadCount();
            }
            break;

          case "UPDATE":
            // Notification updated (e.g., marked as read, action taken)
            if (newRecord) {
              console.log("🔄 Updating notification:", newRecord);
              // Transform database record to notification format
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
              console.log("🚀 Calling updateNotification with:", notification);
              actions.updateNotification(notification.id, notification);
              actions.refreshUnreadCount();
            }
            break;

          case "DELETE":
            // Notification deleted
            if (oldRecord) {
              console.log("🗑️ Removing notification:", oldRecord.id);
              console.log("🚀 Calling removeNotification with:", oldRecord.id);
              actions.removeNotification(oldRecord.id);
              actions.refreshUnreadCount();
            }
            break;

          default:
            console.log("❓ Unknown event type:", eventType);
            // Fallback to full refresh
            console.log(
              "🚀 Calling fetchNotifications and refreshUnreadCount as fallback",
            );
            actions.fetchNotifications();
            actions.refreshUnreadCount();
        }
      } catch (error) {
        console.error("Error handling realtime notification:", error);
        // Fallback to full refresh on error
        console.log(
          "🚀 Calling fetchNotifications and refreshUnreadCount due to error",
        );
        if (actionsRef.current) {
          actionsRef.current.fetchNotifications();
          actionsRef.current.refreshUnreadCount();
        }
      }
    },
    [userId, notificationActions], // Add notificationActions to dependencies
  );

  // Main effect for setting up subscription
  useEffect(() => {
    // Early returns for different conditions, but hooks are called first

    // If using direct library, don't set up Supabase subscription
    if (useDirectLibrary) {
      return;
    }

    // If no notificationActions provided, we can't work with real-time updates
    if (!notificationActions) {
      console.warn(
        "useNotificationRealtime: No notificationActions provided, real-time updates will not work",
      );
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isEnabled: false,
        error: "No notification actions provided",
      }));
      return;
    }

    // Only set up realtime if Supabase is configured and user is authenticated
    if (!supabase || !userId || !enabled) {
      console.log("Skipping Supabase realtime setup:", {
        hasSupabase: !!supabase,
        hasUserId: !!userId,
        userId: userId, // Log the actual value
        enabled,
      });

      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isEnabled: enabled && !!userId,
        error: !supabase
          ? "Supabase not configured"
          : !userId
            ? "No user ID"
            : undefined,
      }));

      return;
    }

    // Validate userId format (should be a valid UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("❌ Invalid userId format:", userId);
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isEnabled: false,
        error: `Invalid userId format: ${userId}`,
      }));
      return;
    }

    console.log(
      "Setting up notification realtime subscription for user:",
      userId,
    );

    let reconnectTimeout: NodeJS.Timeout;
    const maxReconnectAttempts = 3;

    const setupSubscription = (attempt = 1) => {
      if (!supabase) return;

      console.log(
        `🔧 Setting up realtime subscription for user ${userId} (attempt ${attempt})`,
      );
      console.log("📊 Supabase client info:", {
        channels: supabase.getChannels().length,
        realtime: !!supabase.realtime,
      });

      // Subscribe to notification changes for the current user
      const channelName = `notifications-${userId}`;
      console.log("📡 Creating channel:", channelName);

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "notification",
            filter: `user_id=eq.${userId}`, // Only notifications for this user
          },
          (payload) => {
            console.log(
              `🎯 Realtime event received in useNotificationRealtime for user ${userId}:`,
              payload,
            );
            handleRealtimeNotification(payload);
          },
        )
        .subscribe((status, error) => {
          console.log(
            `📡 Notification subscription status for user ${userId}:`,
            status,
          );

          setConnectionState((prev) => ({
            ...prev,
            subscriptionStatus: status,
            channelState: channel.state,
          }));

          if (error) {
            console.error("❌ Subscription error:", error);
            setConnectionState((prev) => ({
              ...prev,
              error: `Subscription error: ${error.message || String(error)}`,
              lastError: error,
              isConnected: false,
            }));
            return;
          }

          if (status === "SUBSCRIBED") {
            console.log("✅ Successfully subscribed to notification changes");
            setConnectionState((prev) => ({
              ...prev,
              isConnected: true,
              error: undefined,
              reconnectAttempts: 0,
            }));
          } else if (status === "CHANNEL_ERROR") {
            console.error(
              "❌ Channel error - this is the issue you're experiencing",
            );
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: "Channel error - falling back to polling",
              reconnectAttempts: attempt,
            }));

            // Try to reconnect if we haven't exceeded max attempts
            if (attempt < maxReconnectAttempts) {
              console.log(
                `Attempting to reconnect (attempt ${attempt + 1}/${maxReconnectAttempts})`,
              );
              reconnectTimeout = setTimeout(() => {
                if (supabase) {
                  supabase.removeChannel(channel);
                  setupSubscription(attempt + 1);
                }
              }, 2000 * attempt); // Exponential backoff
            } else {
              // Max attempts reached, fall back to polling
              console.log(
                "🔄 Max reconnect attempts reached, falling back to polling",
              );
              setConnectionState((prev) => ({
                ...prev,
                isConnected: false,
                error: "Realtime failed, using polling instead",
                usingPolling: true,
              }));
              startPollingFallback();
            }
          } else if (status === "TIMED_OUT") {
            console.error(
              "⏰ Subscription timed out - falling back to polling",
            );
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: "Subscription timed out",
            }));
          } else if (status === "CLOSED") {
            console.log("🔒 Channel closed");
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: "Channel closed",
            }));
          }
        });

      // Test connection
      setTimeout(() => {
        if (supabase) {
          console.log("Testing Supabase connection:", {
            channelState: channel.state,
            subscriptions: supabase.getChannels().length,
            hasRealtime: true,
          });
        }
      }, 2000);

      // Return cleanup function
      return () => {
        console.log("Cleaning up notification subscription");
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        if (supabase) {
          supabase.removeChannel(channel);
        }
        stopPollingFallback(); // Clean up polling when component unmounts
      };
    };

    return setupSubscription();
  }, [userId, enabled]); // Remove handleRealtimeNotification from dependencies to prevent infinite loop

  // If using direct library, return its results
  if (useDirectLibrary) {
    return {
      isConnected: directRealtimeResult.isConnected,
      isEnabled: directRealtimeResult.isEnabled,
      error: directRealtimeResult.error,
      connectionState: directRealtimeResult,
    };
  }

  return {
    isConnected: connectionState.isConnected,
    isEnabled: connectionState.isEnabled,
    error: connectionState.error,
    connectionState,
  };
}

// Helper function to check if Supabase realtime is configured
export function isSupabaseRealtimeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Alternative polling approach if Supabase is not configured
export function useNotificationPolling({
  userId,
  enabled = true,
  intervalMs = 30000, // Poll every 30 seconds
  notificationActions,
}: UseNotificationRealtimeProps & { intervalMs?: number }) {
  useEffect(() => {
    if (!enabled || !userId || !notificationActions) {
      return;
    }

    console.log("Setting up notification polling with interval:", intervalMs);

    const interval = setInterval(() => {
      notificationActions.refreshUnreadCount();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [userId, enabled, intervalMs, notificationActions]);
}
