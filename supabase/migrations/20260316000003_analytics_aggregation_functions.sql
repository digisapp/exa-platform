-- Analytics aggregation functions for performance optimization
-- Replaces loading all page_views rows into JS with database-level aggregation

-- 1. get_analytics_stats: Returns summary stats for a model's profile views
CREATE OR REPLACE FUNCTION public.get_analytics_stats(p_model_id uuid)
RETURNS TABLE(
  total_views_30d bigint,
  unique_visitors_30d bigint,
  today_views bigint
) AS $$
  SELECT
    COUNT(*)::bigint AS total_views_30d,
    COUNT(DISTINCT visitor_id)::bigint AS unique_visitors_30d,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::bigint AS today_views
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '30 days');
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. get_analytics_daily: Returns daily view counts for the last 30 days
CREATE OR REPLACE FUNCTION public.get_analytics_daily(p_model_id uuid)
RETURNS TABLE(
  day text,
  views bigint
) AS $$
  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - 29),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS d
  )
  SELECT
    days.d::text AS day,
    COALESCE(COUNT(pv.id), 0)::bigint AS views
  FROM days
  LEFT JOIN public.page_views pv
    ON pv.model_id = p_model_id
    AND pv.created_at::date = days.d
    AND pv.created_at >= (now() - interval '30 days')
  GROUP BY days.d
  ORDER BY days.d ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. get_analytics_devices: Returns device breakdown for last 30 days
CREATE OR REPLACE FUNCTION public.get_analytics_devices(p_model_id uuid)
RETURNS TABLE(
  device text,
  views bigint
) AS $$
  SELECT
    COALESCE(device, 'unknown') AS device,
    COUNT(*)::bigint AS views
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '30 days')
  GROUP BY device;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. get_analytics_countries: Returns top 5 countries for last 30 days
CREATE OR REPLACE FUNCTION public.get_analytics_countries(p_model_id uuid)
RETURNS TABLE(
  country text,
  views bigint
) AS $$
  SELECT
    country,
    COUNT(*)::bigint AS views
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '30 days')
    AND country IS NOT NULL
  GROUP BY country
  ORDER BY views DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. get_analytics_sources: Returns top 5 traffic sources for last 30 days
CREATE OR REPLACE FUNCTION public.get_analytics_sources(p_model_id uuid)
RETURNS TABLE(
  source text,
  views bigint
) AS $$
  SELECT
    CASE
      WHEN utm_source IS NOT NULL THEN initcap(utm_source)
      WHEN referrer IS NOT NULL THEN initcap(
        regexp_replace(
          regexp_replace(referrer, '^https?://(www\.)?', ''),
          '/.*$', ''
        )
      )
      ELSE 'Direct'
    END AS source,
    COUNT(*)::bigint AS views
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '30 days')
  GROUP BY source
  ORDER BY views DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;

-- Index to accelerate analytics queries by model_id + created_at
CREATE INDEX IF NOT EXISTS idx_page_views_model_created
  ON public.page_views(model_id, created_at DESC)
  WHERE model_id IS NOT NULL;
