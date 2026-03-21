-- Simple key-value settings for platform configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default: auto-reply enabled
INSERT INTO public.platform_settings (key, value) VALUES ('ai_auto_reply_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- RLS: admin only
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Service role can manage settings"
  ON public.platform_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
