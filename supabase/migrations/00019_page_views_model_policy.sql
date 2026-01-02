-- Allow models to read their own page views
-- This fixes the dashboard showing 0 profile views

CREATE POLICY "Models can read their own page views" ON public.page_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = page_views.model_id
      AND models.user_id = auth.uid()
    )
  );
