-- Page Views Analytics Table
-- Tracks all page visits for custom analytics

CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page info
  path text NOT NULL,
  page_type text, -- home, models, profile, gig, dashboard, chats, etc.

  -- Model tracking (for profile pages)
  model_id uuid REFERENCES public.models(id) ON DELETE SET NULL,
  model_username text,

  -- Visitor tracking
  visitor_id text NOT NULL, -- anonymous ID stored in localStorage
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- if logged in
  session_id text, -- groups page views into sessions

  -- Traffic source
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Device info
  device text, -- mobile, tablet, desktop
  browser text,
  os text,
  screen_width int,

  -- Location (from IP)
  country text,
  region text,
  city text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast analytics queries
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_page_type ON public.page_views(page_type);
CREATE INDEX idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_views_model_id ON public.page_views(model_id) WHERE model_id IS NOT NULL;
CREATE INDEX idx_page_views_device ON public.page_views(device);
CREATE INDEX idx_page_views_country ON public.page_views(country) WHERE country IS NOT NULL;

-- Composite index for time-based queries
CREATE INDEX idx_page_views_date_path ON public.page_views(created_at, path);

-- RLS Policies
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (no one can read directly, only through admin API)
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT WITH CHECK (true);

-- Admins can read all page views
CREATE POLICY "Admins can read page views" ON public.page_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Create a function to clean up old page views (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_page_views()
RETURNS void AS $$
BEGIN
  -- Delete page views older than 90 days
  DELETE FROM public.page_views WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
