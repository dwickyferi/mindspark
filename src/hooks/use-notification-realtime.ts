import { useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNotifications } from "./use-notifications";

// Note: You'll need to set up your Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

// Create a Supabase client instance if credentials are available
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

interface UseNotificationRealtimeProps {
  userId?: string;
  enabled?: boolean;
}

export function useNotificationRealtime({
  userId,
  enabled = true,
}: UseNotificationRealtimeProps) {
  const { refreshUnreadCount, fetchNotifications } = useNotifications();

  const handleRealtimeNotification = useCallback(
    (payload: any) => {
      console.log("Received realtime notification:", payload);

      // Refresh notifications list and unread count
      if (payload.eventType === "INSERT") {
        // New notification received
        fetchNotifications();
        refreshUnreadCount();
      } else if (payload.eventType === "UPDATE") {
        // Notification updated (e.g., marked as read, action taken)
        fetchNotifications();
        refreshUnreadCount();
      }
    },
    [fetchNotifications, refreshUnreadCount],
  );

  useEffect(() => {
    // Only set up realtime if Supabase is configured and user is authenticated
    if (!supabase || !userId || !enabled) {
      return;
    }

    console.log(
      "Setting up notification realtime subscription for user:",
      userId,
    );

    // Subscribe to notification changes for the current user
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "notification",
          filter: `user_id=eq.${userId}`, // Only notifications for this user
        },
        handleRealtimeNotification,
      )
      .subscribe((status) => {
        console.log("Notification subscription status:", status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up notification subscription");
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, handleRealtimeNotification]);

  return {
    isConnected: supabase !== null,
    isEnabled: enabled && !!userId,
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
}: UseNotificationRealtimeProps & { intervalMs?: number }) {
  const { refreshUnreadCount } = useNotifications();

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    console.log("Setting up notification polling with interval:", intervalMs);

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [userId, enabled, intervalMs, refreshUnreadCount]);

  return {
    isPolling: enabled && !!userId,
  };
}
