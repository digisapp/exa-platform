-- Add INSERT policy for notifications so system can create notifications for users
-- This allows authenticated users to insert notifications (API routes create them)

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
