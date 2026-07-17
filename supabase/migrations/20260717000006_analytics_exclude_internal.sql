-- Make ALL admin traffic analytics count real people only, and add signups-by-country.
--
-- 1) internal_visitor_ids(): devices that have ever been used with an admin login
--    (also catches the same device browsing under test/model/fan accounts).
-- 2) Existing analytics functions are replaced in place to exclude those devices;
--    CREATE OR REPLACE preserves their grants, so the currently deployed
--    /api/admin/analytics route keeps working before the app change ships.
-- 3) New count_page_views + get_signups_by_country are service-role-only,
--    matching get_country_visitor_breakdown (20260717000005).

CREATE OR REPLACE FUNCTION internal_visitor_ids()
RETURNS TABLE(visitor_id text) AS $$
  SELECT DISTINCT pv.visitor_id
  FROM page_views pv
  JOIN actors a ON a.user_id = pv.user_id
  WHERE a.type = 'admin'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE EXECUTE ON FUNCTION internal_visitor_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION internal_visitor_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION internal_visitor_ids() FROM authenticated;
GRANT EXECUTE ON FUNCTION internal_visitor_ids() TO service_role;

CREATE OR REPLACE FUNCTION count_unique_visitors(start_date timestamptz)
RETURNS bigint AS $$
  SELECT COUNT(DISTINCT visitor_id)
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_device_breakdown(start_date timestamptz)
RETURNS TABLE(device_type text, count bigint) AS $$
  SELECT
    COALESCE(device_type, 'unknown') as device_type,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY device_type
  ORDER BY count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_top_pages(start_date timestamptz, limit_count int)
RETURNS TABLE(page_path text, page_type text, count bigint) AS $$
  SELECT
    page_path,
    page_type,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY page_path, page_type
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_top_model_profiles(start_date timestamptz, limit_count int)
RETURNS TABLE(model_username text, count bigint) AS $$
  SELECT
    model_username,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND page_type = 'profile'
    AND model_username IS NOT NULL
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY model_username
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_daily_views(start_date timestamptz)
RETURNS TABLE(date date, views bigint, visitors bigint) AS $$
  SELECT
    DATE(created_at) as date,
    COUNT(*) as views,
    COUNT(DISTINCT visitor_id) as visitors
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_browser_breakdown(start_date timestamptz)
RETURNS TABLE(browser text, count bigint) AS $$
  SELECT
    COALESCE(browser, 'Unknown') as browser,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY browser
  ORDER BY count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_country_breakdown(start_date timestamptz, limit_count int)
RETURNS TABLE(country text, count bigint) AS $$
  SELECT
    COALESCE(country, 'Unknown') as country,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids())
  GROUP BY country
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Total page views, internal excluded (replaces the route's direct table count)
CREATE OR REPLACE FUNCTION count_page_views(start_date timestamptz)
RETURNS bigint AS $$
  SELECT COUNT(*)
  FROM page_views
  WHERE created_at >= start_date
    AND visitor_id NOT IN (SELECT visitor_id FROM internal_visitor_ids());
$$ LANGUAGE sql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION count_page_views(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION count_page_views(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION count_page_views(timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION count_page_views(timestamptz) TO service_role;

-- Signups by country: new model/fan accounts attributed to the country of their
-- earliest logged-in page view. Users with no located view count as 'Unknown'.
CREATE OR REPLACE FUNCTION get_signups_by_country(start_date timestamptz, limit_count int)
RETURNS TABLE(country text, signups bigint, models bigint, fans bigint) AS $$
  WITH new_users AS (
    SELECT a.user_id,
           bool_or(a.type = 'model') AS is_model,
           bool_or(a.type = 'fan') AS is_fan
    FROM actors a
    WHERE a.created_at >= start_date
      AND a.type IN ('model', 'fan')
      AND a.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM actors ad WHERE ad.user_id = a.user_id AND ad.type = 'admin'
      )
    GROUP BY a.user_id
  ),
  located AS (
    SELECT nu.is_model, nu.is_fan,
      (SELECT pv.country FROM page_views pv
        WHERE pv.user_id = nu.user_id AND pv.country IS NOT NULL
        ORDER BY pv.created_at ASC LIMIT 1) AS country
    FROM new_users nu
  )
  SELECT
    COALESCE(country, 'Unknown') AS country,
    COUNT(*) AS signups,
    COUNT(*) FILTER (WHERE is_model) AS models,
    COUNT(*) FILTER (WHERE is_fan) AS fans
  FROM located
  GROUP BY 1
  ORDER BY signups DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION get_signups_by_country(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_signups_by_country(timestamptz, int) FROM anon;
REVOKE EXECUTE ON FUNCTION get_signups_by_country(timestamptz, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION get_signups_by_country(timestamptz, int) TO service_role;
