"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationRealtime } from "@/hooks/use-notification-simple-realtime";
import { NotificationPanel } from "@/components/notification-panel";
import { authClient } from "auth/client";
import { cn } from "lib/utils";

interface NotificationButtonProps {
  className?: string;
}

export function NotificationButton({ className }: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const {
    unreadCount,
    markInfoNotificationsAsRead,
    notifications,
    markAsRead,
  } = useNotifications();

  // Enable real-time updates
  useNotificationRealtime({
    userId: session?.user?.id,
    enabled: !!session?.user?.id,
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // When panel opens, auto-mark informational notifications as read
    if (open) {
      markInfoNotificationsAsRead();
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
