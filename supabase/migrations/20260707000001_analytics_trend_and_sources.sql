-- Analytics: add previous-30d window to stats (trend deltas) and fold
-- internal referrers into "Direct" inside the sources aggregation.
--
-- 1. get_analytics_stats gains prev_views_30d / prev_unique_30d so the page
--    can show a vs-prior-30-days trend. Return type changes, so drop first.
-- 2. get_analytics_sources previously counted historical examodels.com /
--    *.vercel.app / localhost referrers as their own sources; the page
--    filtered them AFTER the LIMIT 5, which could push real external
--    sources out of the list. Classify them as "Direct" in SQL instead
--    (matches how /api/analytics/track stores them since PR #60).

DROP FUNCTION IF EXISTS public.get_analytics_stats(uuid);

CREATE FUNCTION public.get_analytics_stats(p_model_id uuid)
RETURNS TABLE(
  total_views_30d bigint,
  unique_visitors_30d bigint,
  today_views bigint,
  prev_views_30d bigint,
  prev_unique_30d bigint
) AS $$
  SELECT
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::bigint AS total_views_30d,
    COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= now() - interval '30 days')::bigint AS unique_visitors_30d,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::bigint AS today_views,
    COUNT(*) FILTER (WHERE created_at < now() - interval '30 days')::bigint AS prev_views_30d,
    COUNT(DISTINCT visitor_id) FILTER (WHERE created_at < now() - interval '30 days')::bigint AS prev_unique_30d
  FROM public.page_views
  WHERE model_id = p_model_id
    AND created_at >= (now() - interval '60 days');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_analytics_sources(p_model_id uuid)
RETURNS TABLE(
  source text,
  views bigint
) AS $$
  SELECT
    CASE
      WHEN lower(t.utm_source) = 'qr' THEN 'QR Code'
      WHEN t.utm_source IS NOT NULL THEN initcap(t.utm_source)
      WHEN t.host IS NULL THEN 'Direct'
      WHEN t.host = 'examodels.com'
        OR t.host LIKE '%.vercel.app'
        OR t.host LIKE 'localhost%' THEN 'Direct'
      -- android-app://com.google.android.googlequicksearchbox = Google app
      WHEN t.host LIKE 'com.google.android%' THEN 'Google.com'
      ELSE initcap(t.host)
    END AS source,
    COUNT(*)::bigint AS views
  FROM (
    SELECT
      utm_source,
      CASE WHEN referrer IS NOT NULL THEN
        lower(regexp_replace(
          regexp_replace(referrer, '^[a-z][a-z0-9+.-]*://(www\.)?', ''),
          '/.*$', ''
        ))
      END AS host
    FROM public.page_views
    WHERE model_id = p_model_id
      AND created_at >= (now() - interval '30 days')
  ) t
  GROUP BY 1
  ORDER BY views DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;
