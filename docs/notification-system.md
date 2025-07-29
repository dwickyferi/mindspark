# Real-Time Notification System

A comprehensive notification system integrated with PostgreSQL that supports both informational and actionable notifications with real-time updates.

## Features

- ✅ **Two Notification Types**

  - **Informational**: Text-only notifications (e.g., "File uploaded successfully")
  - **Actionable**: Notifications with Accept/Reject buttons (e.g., "Project invitation")

- ✅ **Real-time Updates**

  - Polling-based updates (30-second intervals)
  - Window focus refresh
  - WebSocket support (ready for implementation)
  - Supabase Realtime support (optional)

- ✅ **Complete UI System**

  - Notification button with unread badge
  - Dropdown panel with notification list
  - Individual notification items with actions
  - Responsive design with dark mode support

- ✅ **Backend Infrastructure**
  - PostgreSQL schema with proper indexing
  - Repository pattern for data access
  - RESTful API endpoints
  - Notification service for easy integration

## Database Schema

```sql
CREATE TABLE "notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text NOT NULL, -- 'info' | 'actionable'
  "message" text NOT NULL,
  "payload" json, -- Additional context data
  "action_status" text, -- 'pending' | 'accepted' | 'rejected'
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

## API Endpoints

### GET `/api/notifications`

Fetch notifications for the current user.

**Query Parameters:**

- `limit` (number): Maximum notifications to return (default: 50)
- `offset` (number): Pagination offset (default: 0)
- `unread_only` (boolean): Return only unread count

**Response:**

```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "actionable",
      "message": "You have been invited to join Project X.",
      "payload": {
        "projectId": "uuid",
        "projectName": "Project X",
        "invitedBy": "uuid"
      },
      "actionStatus": "pending",
      "isRead": false,
      "createdAt": "2025-01-30T10:00:00Z",
      "updatedAt": "2025-01-30T10:00:00Z"
    }
  ],
  "unreadCount": 5,
  "hasMore": true
}
```

### PUT `/api/notifications`

Mark notifications as read.

**Request Body:**

```json
{
  "notificationIds": ["uuid1", "uuid2"]
}
```

### POST `/api/notifications/respond`

Respond to actionable notifications.

**Request Body:**

```json
{
  "notificationId": "uuid",
  "action": "accept" // or "reject"
}
```

## Usage Examples

### 1. Basic Integration

```tsx
import { NotificationButton } from "@/components/notification-button";
import { useNotificationRealtime } from "@/hooks/use-notification-simple-realtime";

function AppHeader() {
  // Enable real-time updates
  useNotificationRealtime({
    userId: "current-user-id",
    enabled: true,
  });

  return (
    <header>
      <NotificationButton />
    </header>
  );
}
```

### 2. Creating Notifications

```typescript
import { NotificationService } from "lib/services/notification-service";

// Project invitation
await NotificationService.createProjectInvitation(
  userId,
  "My Project",
  projectId,
  invitingUserId
);

// File upload success
await NotificationService.createFileUploadSuccess(
  userId,
  "document.pdf",
  projectId
);

// Generic notification
await NotificationService.createNotification(
  userId,
  "info",
  "Your workflow has completed successfully.",
  { workflowId: "uuid" }
);
```

### 3. Custom Notification Display

```tsx
import { useNotifications } from "@/hooks/use-notifications";

function CustomNotifications() {
  const { notifications, unreadCount, markAsRead, respondToNotification } =
    useNotifications();

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <p>{notification.message}</p>

          {notification.type === "actionable" &&
            notification.actionStatus === "pending" && (
              <div>
                <button
                  onClick={() =>
                    respondToNotification(notification.id, "accept")
                  }
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    respondToNotification(notification.id, "reject")
                  }
                >
                  Reject
                </button>
              </div>
            )}

          {!notification.isRead && (
            <button onClick={() => markAsRead([notification.id])}>
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Components

### NotificationButton

The main notification trigger button with unread badge.

**Props:**

- `className?: string` - Additional CSS classes

### NotificationPanel

The dropdown panel showing notification list.

**Props:**

- `onClose?: () => void` - Called when panel should close
- `className?: string` - Additional CSS classes

### NotificationItem

Individual notification item component.

**Props:**

- `notification: Notification` - The notification data
- `onMarkAsRead: (id: string) => void` - Mark as read callback
- `onRespond: (id: string, action: 'accept' | 'reject') => void` - Action callback

## Hooks

### useNotifications()

Main hook for notification management.

**Returns:**

```typescript
{
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  respondToNotification: (id: string, action: 'accept' | 'reject') => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}
```

### useNotificationRealtime()

Enables real-time notification updates.

**Parameters:**

- `userId?: string` - Current user ID
- `enabled?: boolean` - Enable/disable real-time updates

## Real-time Options

### 1. Polling (Default)

- Updates every 30 seconds
- Refreshes on window focus
- Lightweight, no additional infrastructure needed

### 2. WebSocket (Ready for Implementation)

```typescript
// Uncomment in use-notification-simple-realtime.ts
const ws = new WebSocket(
  `ws://localhost:3000/api/notifications/ws?userId=${userId}`
);
```

### 3. Supabase Realtime (Optional)

```bash
npm install @supabase/supabase-js
```

Set environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then use:

```typescript
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";
```

## Integration Examples

### Project Invitation Flow

1. **User A invites User B to a project:**

```typescript
await NotificationService.createProjectInvitation(
  userB.id,
  project.name,
  project.id,
  userA.id,
  invitation.id
);
```

2. **User B receives real-time notification**
3. **User B clicks Accept:**
   - API updates `action_status = 'accepted'`
   - User B is added to the project
   - Notification is marked as read

### File Upload Success

```typescript
// After successful file upload
await NotificationService.createFileUploadSuccess(
  userId,
  uploadedFile.name,
  projectId
);
```

## Styling

The notification system uses Tailwind CSS and follows the existing design system:

- **Colors**: Follows theme colors (light/dark mode)
- **Typography**: Consistent with app typography scale
- **Spacing**: Uses standard spacing tokens
- **Animations**: Subtle hover and transition effects

## Error Handling

- **Network errors**: Graceful fallback with error messages
- **Validation errors**: Zod schema validation on API inputs
- **Permission errors**: Proper authorization checks
- **Rate limiting**: Built-in via API design

## Performance Considerations

- **Database**: Proper indexing on user_id, created_at, is_read
- **API**: Pagination support for large notification lists
- **Frontend**: React optimizations with useCallback and useMemo
- **Real-time**: Configurable polling intervals to balance freshness vs. load

## Migration

The notification table has been created via Drizzle migration:

```bash
pnpm run db:generate  # Generate migration
pnpm run db:migrate   # Apply migration
```

## Future Enhancements

- [ ] Push notifications (web/mobile)
- [ ] Email notification fallback
- [ ] Notification categories/filtering
- [ ] Bulk actions (mark all as read)
- [ ] Notification preferences per user
- [ ] Notification templates system
- [ ] Analytics and metrics
- [ ] A/B testing for notification content
