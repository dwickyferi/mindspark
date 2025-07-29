"use client";

import { ScrollArea } from "ui/scroll-area";
import { Button } from "ui/button";
import { CheckCheck, RefreshCw, Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/notification-item";
import { cn } from "lib/utils";

interface NotificationPanelProps {
  onClose?: () => void;
  className?: string;
}

export function NotificationPanel({
  onClose,
  className,
}: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    respondToNotification,
  } = useNotifications();

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <div className={cn("flex flex-col w-full max-w-md", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <div className="h-4 w-4 bg-red-500 dark:bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-7 w-7 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Refresh notifications"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 max-h-96">
        {error && (
          <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border-b border-destructive/20">
            {error}
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3 bg-muted rounded-md" />
                <div className="h-3 bg-muted rounded-md w-3/4" />
                <div className="h-2 bg-muted rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              All caught up!
            </p>
            <p className="text-xs text-muted-foreground">
              No new notifications
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={(id) => markAsRead([id])}
                  onRespond={(id, action) => respondToNotification(id, action)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
