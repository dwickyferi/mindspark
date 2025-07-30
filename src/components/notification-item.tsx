"use client";

import { format } from "date-fns";
import { Check, X, CheckCircle, Clock, Mail } from "lucide-react";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Notification } from "app-types/notification";
import { cn } from "lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRespond: (id: string, action: "accept" | "reject") => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onRespond,
}: NotificationItemProps) {
  const handleClick = () => {
    // Mark any unread notification as read when clicked, not just "info" type
    if (!notification.isRead) {
      console.log(
        "🔔 Marking notification as read:",
        notification.id,
        notification.type,
      );
      onMarkAsRead(notification.id);
    }
  };

  const handleAccept = () => {
    onRespond(notification.id, "accept");
  };

  const handleReject = () => {
    onRespond(notification.id, "reject");
  };

  const getActionStatusBadge = () => {
    if (notification.type !== "actionable" || !notification.actionStatus) {
      return null;
    }

    const variants = {
      pending: {
        variant: "outline" as const,
        text: "Pending",
        className: "text-foreground border-amber-400 dark:border-amber-500",
      },
      accepted: {
        variant: "outline" as const,
        text: "Accepted",
        className: "text-foreground border-green-500 dark:border-green-400",
      },
      rejected: {
        variant: "outline" as const,
        text: "Rejected",
        className: "text-foreground border-red-500 dark:border-red-400",
      },
    };

    const config = variants[notification.actionStatus];

    return (
      <Badge
        variant={config.variant}
        className={cn("text-xs font-normal", config.className)}
      >
        {config.text}
      </Badge>
    );
  };

  const getNotificationIcon = () => {
    if (notification.type === "actionable") {
      if (notification.actionStatus === "accepted") {
        return (
          <div className="h-6 w-6 rounded-full bg-background border-2 border-green-500 dark:border-green-400 flex items-center justify-center">
            <CheckCircle className="h-3.5 w-3.5 text-foreground" />
          </div>
        );
      }
      if (notification.actionStatus === "rejected") {
        return (
          <div className="h-6 w-6 rounded-full bg-background border-2 border-red-500 dark:border-red-400 flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-foreground" />
          </div>
        );
      }
      return (
        <div className="h-6 w-6 rounded-full bg-background border-2 border-amber-400 dark:border-amber-500 flex items-center justify-center">
          <Mail className="h-3.5 w-3.5 text-foreground" />
        </div>
      );
    }

    return (
      <div className="h-6 w-6 rounded-full bg-muted/30 flex items-center justify-center">
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            notification.isRead ? "bg-muted-foreground/40" : "bg-blue-500",
          )}
        />
      </div>
    );
  };

  const canShowActions =
    notification.type === "actionable" &&
    notification.actionStatus === "pending";

  return (
    <div
      className={cn(
        "px-4 py-3 hover:bg-accent/30 transition-colors duration-200 cursor-pointer group",
        !notification.isRead && "bg-accent/10",
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getNotificationIcon()}</div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header with message and badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  notification.isRead
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                <span className="line-clamp-2">{notification.message}</span>
              </p>
            </div>
            {getActionStatusBadge()}
          </div>

          {/* Timestamp and unread indicator */}
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground/70" />
            <time className="text-xs text-muted-foreground">
              {format(new Date(notification.createdAt), "MMM d, h:mm a")}
            </time>
            {!notification.isRead && (
              <div className="h-1 w-1 rounded-full bg-blue-500" />
            )}
          </div>

          {/* Mark as read button for unread notifications (except actionable ones) */}
          {!notification.isRead && notification.type !== "actionable" && (
            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    "🔔 Mark as read button clicked for:",
                    notification.id,
                  );
                  onMarkAsRead(notification.id);
                }}
              >
                Mark as read
              </Button>
            </div>
          )}

          {/* Action buttons for actionable notifications */}
          {canShowActions && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 px-3 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept();
                }}
              >
                <Check className="h-3 w-3 mr-1.5" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject();
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
