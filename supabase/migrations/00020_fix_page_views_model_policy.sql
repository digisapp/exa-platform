-- Fix the page views policy to match by username instead of model_id
-- The PageViewTracker only sets model_username, not model_id

-- Drop the old policy that matched by model_id
DROP POLICY IF EXISTS "Models can read their own page views" ON public.page_views;

-- Create new policy that matches by username
CREATE POLICY "Models can read their own page views" ON public.page_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE LOWER(models.username) = LOWER(page_views.model_username)
      AND models.user_id = auth.uid()
    )
  );
