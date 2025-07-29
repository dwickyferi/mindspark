# Project Invitation Flow - Notification-Based Implementation

## Overview

This document describes the notification-based project invitation system that replaces the broken direct-invite mechanism. The new system uses the existing real-time notification infrastructure to handle project invitations with proper approval flow.

## Architecture Flow

### 1. Invitation Request

```
Owner/Admin → POST /api/projects/{projectId}/invite-member → Creates Notification → Real-time Update
```

### 2. User Response Flow

```
User sees notification → Clicks Accept/Reject → POST /api/notifications/respond → Updates project membership
```

## API Endpoints

### Project Invitation (`POST /api/projects/{projectId}/invite-member`)

**Request Body:**

```json
{
  "email": "user@example.com",
  "role": "member" | "admin"
}
```

**Process:**

1. Validates inviter permissions (must be Owner/Admin)
2. Finds target user by email (must exist in system)
3. Checks if user is already a project member
4. Checks for existing pending invitations
5. Creates actionable notification for target user
6. Returns success response

**Response:**

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "invitation": {
    "targetUserId": "user-id",
    "targetUserEmail": "user@example.com",
    "projectName": "Project Name",
    "role": "member",
    "notificationId": "notification-id"
  }
}
```

### Notification Response (`POST /api/notifications/respond`)

**Request Body:**

```json
{
  "notificationId": "notification-id",
  "action": "accept" | "reject"
}
```

**Process:**

1. Validates notification ownership
2. Updates notification status
3. **If Accept:** Adds user to project with specified role
4. **If Reject:** Marks notification as handled
5. Returns updated notification and unread count

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('info', 'actionable')),
  message TEXT NOT NULL,
  payload JSONB,
  action_status TEXT CHECK (action_status IN ('pending', 'accepted', 'rejected')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Notification Payload for Project Invitations

```json
{
  "projectId": "project-uuid",
  "projectName": "Project Name",
  "invitedBy": "inviter-user-id",
  "role": "member" | "admin"
}
```

## Frontend Components

### Notification Item Component

- Displays invitation message: "You have been invited to join the project 'Project Name'."
- Shows Accept/Reject buttons for pending actionable notifications
- Updates in real-time when user responds
- Shows status badges (Pending, Accepted, Rejected)

### Real-time Updates

- Uses polling every 30 seconds to fetch new notifications
- Updates notification badge count automatically
- Refreshes project list when user accepts invitation

## Testing

### Test Invitation Creation

```bash
curl -X POST http://localhost:3000/api/notifications/test-invite \
  -H "Content-Type: application/json" \
  -d '{"targetEmail": "test@example.com", "projectName": "Test Project", "role": "member"}'
```

### Test Invitation Response

```bash
curl -X POST http://localhost:3000/api/notifications/respond \
  -H "Content-Type: application/json" \
  -d '{"notificationId": "notification-id", "action": "accept"}'
```

## Benefits of New System

### Security & UX Improvements

- ✅ **Permission-safe:** No database insertions until user approves
- ✅ **Real-time delivery:** Users see invitations immediately
- ✅ **Full control:** Users can accept or reject invitations
- ✅ **Audit trail:** All invitation responses are tracked
- ✅ **Cleaner UX:** No broken error states from direct invites

### Technical Advantages

- ✅ **Leverages existing infrastructure:** Uses notification system already in place
- ✅ **Consistent with app patterns:** Same UI/UX as other notifications
- ✅ **Extensible:** Easy to add other types of approvals (document sharing, etc.)
- ✅ **Real-time ready:** Built on polling, can upgrade to WebSocket easily

## Migration from Old System

The old invitation system (with project_invitations table and token-based links) is still intact but unused. The new system:

1. **Does not create project_invitation records**
2. **Uses notification system exclusively**
3. **Bypasses token-based email links**
4. **Requires users to exist in system before invitation**

## Error Handling

### Common Error Cases

- **404:** Target user email not found in system
- **400:** User already member of project
- **400:** Pending invitation already exists
- **403:** Insufficient permissions to invite
- **401:** Unauthorized request

### Frontend Error Display

- Shows toast messages for API errors
- Gracefully handles offline/network issues
- Retries failed requests automatically

## Future Enhancements

### Potential Improvements

- **Email notifications:** Send email alerts for invitations
- **Batch invitations:** Invite multiple users at once
- **Invitation expiry:** Auto-expire old pending invitations
- **Custom messages:** Allow personalized invitation messages
- **WebSocket upgrade:** Replace polling with real-time WebSocket updates

## Implementation Files

### Backend

- `src/app/api/projects/[projectId]/invite-member/route.ts` - Main invitation endpoint
- `src/app/api/notifications/respond/route.ts` - Response handler
- `src/lib/services/notification-service.ts` - Notification creation helpers
- `src/types/notification.ts` - Type definitions

### Frontend

- `src/components/notification-item.tsx` - Notification display
- `src/components/notification-panel.tsx` - Notification list
- `src/hooks/use-notifications.ts` - Notification state management

### Database

- `src/lib/db/pg/repositories/notification-repository.pg.ts` - Data access
- `src/lib/db/pg/schema.pg.ts` - Database schema
