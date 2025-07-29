import { z } from "zod";

export type NotificationType = "info" | "actionable";
export type NotificationActionStatus = "pending" | "accepted" | "rejected";

export interface NotificationPayload {
  projectId?: string;
  invitedBy?: string;
  projectName?: string;
  role?: string;
  invitationId?: string;
  // Allow for extensibility
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  payload?: NotificationPayload;
  actionStatus?: NotificationActionStatus;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  message: string;
  payload?: NotificationPayload;
  actionStatus?: NotificationActionStatus;
}

export interface NotificationUpdateInput {
  isRead?: boolean;
  actionStatus?: NotificationActionStatus;
}

export interface NotificationResponse {
  notificationId: string;
  action: "accept" | "reject";
}

// Repository interface
export interface NotificationRepository {
  create: (input: NotificationCreateInput) => Promise<Notification>;
  findByUserId: (
    userId: string,
    limit?: number,
    offset?: number,
  ) => Promise<Notification[]>;
  findById: (id: string) => Promise<Notification | null>;
  update: (id: string, input: NotificationUpdateInput) => Promise<Notification>;
  markAsRead: (ids: string[]) => Promise<void>;
  getUnreadCount: (userId: string) => Promise<number>;
  deleteById: (id: string) => Promise<void>;
}

// Zod schemas for validation
export const NotificationCreateInputZodSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["info", "actionable"]),
  message: z.string().min(1),
  payload: z.record(z.any()).optional(),
  actionStatus: z.enum(["pending", "accepted", "rejected"]).optional(),
});

export const NotificationUpdateInputZodSchema = z.object({
  isRead: z.boolean().optional(),
  actionStatus: z.enum(["pending", "accepted", "rejected"]).optional(),
});

export const NotificationResponseZodSchema = z.object({
  notificationId: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
});

export const MarkAsReadZodSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});
