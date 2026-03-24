-- Add missing columns that the analytics track API tries to insert
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_hash text;

-- Fix get_analytics_devices: use actual column name "device_type"
CREATE OR REPLACE FUNCTION public.get_analytics_devices(p_model_id uuid)
RETURNS TABLE(
  device text,
  views bigint
) AS $$
  SELECT
    COALESCE(device_type, 'unknown') AS device,
    COUNT(*)::bigint AS views
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '30 days')
  GROUP BY device_type;
$$ LANGUAGE sql SECURITY DEFINER;
