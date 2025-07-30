# Supabase Real-time Notifications Configuration

To enable real-time notifications using Supabase, you need to set up the following environment variables:

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Supabase Configuration for Real-time Notifications
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Database Setup

1. **Enable Realtime on the notifications table:**

   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE notification;
   ```

2. **Set up Row Level Security (RLS):**

   ```sql
   -- Enable RLS on the notification table
   ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

   -- Create a policy to allow users to only see their own notifications
   CREATE POLICY "Users can view their own notifications" ON notification
     FOR SELECT USING (user_id = auth.uid());

   -- Create a policy to allow the application to insert notifications
   CREATE POLICY "Application can insert notifications" ON notification
     FOR INSERT WITH CHECK (true);

   -- Create a policy to allow users to update their own notifications
   CREATE POLICY "Users can update their own notifications" ON notification
     FOR UPDATE USING (user_id = auth.uid());
   ```

3. **Grant permissions:**
   ```sql
   -- Grant permissions for realtime
   GRANT USAGE ON SCHEMA public TO anon, authenticated;
   GRANT ALL ON notification TO anon, authenticated;
   ```

## How it Works

1. **Real-time Subscription**: The application subscribes to changes on the `notification` table filtered by `user_id`
2. **Event Handling**: When notifications are inserted, updated, or deleted, the UI automatically updates
3. **Fallback**: If Supabase is not configured, the system falls back to polling every 15 seconds
4. **Smart Updates**: Instead of refreshing all data, individual notifications are added/updated/removed in real-time

## Features

- ✅ **Real-time notification badge updates**
- ✅ **Live notification panel updates**
- ✅ **Automatic fallback to polling**
- ✅ **User-specific notifications only**
- ✅ **Efficient state management**

## Testing

To test the real-time functionality:

1. Set up your Supabase credentials
2. Open the application in two browser windows/tabs
3. Create a notification (e.g., project invitation) in one window
4. Watch the notification appear instantly in the other window

## Troubleshooting

- **Check browser console** for connection status logs
- **Verify environment variables** are set correctly
- **Confirm RLS policies** are properly configured
- **Test with polling fallback** if realtime isn't working
