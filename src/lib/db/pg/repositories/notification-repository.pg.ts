import { and, desc, eq, inArray, count } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { NotificationSchema } from "../schema.pg";
import {
  NotificationRepository,
  NotificationCreateInput,
  NotificationUpdateInput,
  type Notification,
} from "app-types/notification";

class PgNotificationRepository implements NotificationRepository {
  async create(input: NotificationCreateInput): Promise<Notification> {
    const [notification] = await db
      .insert(NotificationSchema)
      .values({
        userId: input.userId,
        type: input.type,
        message: input.message,
        payload: input.payload || null,
        actionStatus: input.actionStatus || null,
        isRead: false,
      })
      .returning();

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload || undefined,
      actionStatus: notification.actionStatus || undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Notification[]> {
    let query = db
      .select()
      .from(NotificationSchema)
      .where(eq(NotificationSchema.userId, userId))
      .orderBy(desc(NotificationSchema.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }

    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    const notifications = await query;

    return notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload || undefined,
      actionStatus: notification.actionStatus || undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }));
  }

  async findById(id: string): Promise<Notification | null> {
    const [notification] = await db
      .select()
      .from(NotificationSchema)
      .where(eq(NotificationSchema.id, id));

    if (!notification) {
      return null;
    }

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload || undefined,
      actionStatus: notification.actionStatus || undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async update(
    id: string,
    input: NotificationUpdateInput,
  ): Promise<Notification> {
    const [notification] = await db
      .update(NotificationSchema)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(NotificationSchema.id, id))
      .returning();

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload || undefined,
      actionStatus: notification.actionStatus || undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async markAsRead(ids: string[]): Promise<void> {
    await db
      .update(NotificationSchema)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(inArray(NotificationSchema.id, ids));
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(NotificationSchema).where(eq(NotificationSchema.id, id));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(NotificationSchema)
      .where(
        and(
          eq(NotificationSchema.userId, userId),
          eq(NotificationSchema.isRead, false),
        ),
      );

    return result?.count || 0;
  }

  async findByUserIdAndTypes(
    userId: string,
    types: string[],
    limit?: number,
    offset?: number,
  ): Promise<Notification[]> {
    let query = db
      .select()
      .from(NotificationSchema)
      .where(
        and(
          eq(NotificationSchema.userId, userId),
          inArray(NotificationSchema.type, types as any),
        ),
      )
      .orderBy(desc(NotificationSchema.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }

    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    const notifications = await query;

    return notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      payload: notification.payload || undefined,
      actionStatus: notification.actionStatus || undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }));
  }
}

export const pgNotificationRepository = new PgNotificationRepository();
