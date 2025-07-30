"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { useNotificationContext } from "@/components/notification-provider";
import {
  isSupabaseConfigured,
  isSupabaseRealtimeAvailable,
} from "@/lib/supabase";
import { NotificationPanel } from "@/components/notification-panel";
import { authClient } from "auth/client";
import { cn } from "lib/utils";

interface NotificationButtonProps {
  className?: string;
}

export function NotificationButton({ className }: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const {
    unreadCount,
    markNonActionableNotificationsAsRead,
    notifications,
    markAsRead,
    connectionStatus,
    isRealtimeEnabled,
  } = useNotificationContext();

  // Check if Supabase is available
  const supabaseAvailable = isSupabaseRealtimeAvailable();

  // Debug logging
  useEffect(() => {
    console.log("NotificationButton - Supabase status:", {
      configured: isSupabaseConfigured(),
      available: supabaseAvailable,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      userId: userId || "no user",
    });

    console.log("NotificationButton - Current notification state:", {
      unreadCount,
      notificationCount: notifications.length,
      userId: userId || "no user",
    });
  }, [supabaseAvailable, userId, unreadCount, notifications.length]);

  // Debug connection status
  useEffect(() => {
    console.log("NotificationButton - Connection status:", {
      connectionStatus,
      isRealtimeEnabled,
      userId: userId || "no user",
    });
  }, [connectionStatus, isRealtimeEnabled, userId]);

  // Debug notification state changes
  useEffect(() => {
    console.log("🔔 NotificationButton - State changed:", {
      unreadCount,
      notificationCount: notifications.length,
      userId: userId || "no user",
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [unreadCount, notifications.length, userId]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // When panel opens, auto-mark all non-actionable notifications as read
    // (all types except actionable notifications with pending status)
    if (open) {
      console.log(
        "🔔 Notification panel opened - auto-marking non-actionable notifications as read",
      );
      markNonActionableNotificationsAsRead();
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-full hover:bg-accent/50 transition-colors",
            className,
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          onDoubleClick={handleMarkAllAsRead}
          title={
            unreadCount > 0
              ? "Double-click to mark all as read"
              : "Notifications"
          }
        >
          <Bell
            className={cn(
              "h-4 w-4 transition-colors",
              unreadCount > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 dark:bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 shadow-lg border-0 bg-background/95 backdrop-blur-sm"
        align="end"
        sideOffset={8}
      >
        <div className="rounded-lg border bg-card text-card-foreground shadow-md">
          <NotificationPanel onClose={() => setIsOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
