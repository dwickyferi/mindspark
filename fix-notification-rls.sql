-- Fix notification table RLS policies and enable realtime
-- Run this in your Supabase SQL editor or via psql

-- First, let's see what RLS policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'notification';

-- Enable RLS on notification table (if it's not already enabled)
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case we need to recreate them)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notification;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notification;

-- Create comprehensive RLS policies for notifications
-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notification FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to insert notifications (for their own user_id or system notifications)
CREATE POLICY "Users can insert their own notifications" 
ON public.notification FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notification FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.notification FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for the notification table
ALTER TABLE public.notification REPLICA IDENTITY FULL;

-- Grant necessary permissions to the anon role for testing
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification TO anon;

-- Also grant to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification TO authenticated;

-- For testing purposes, let's create a temporary policy that allows anon access
-- You should remove this in production and ensure proper authentication
CREATE POLICY "Allow anon access for testing" 
ON public.notification FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Check the notification table structure
\d+ public.notification;

-- Show all policies after creation
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'notification';
