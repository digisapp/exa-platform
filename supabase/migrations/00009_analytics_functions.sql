-- Analytics helper functions for admin dashboard

-- Count unique visitors in a date range
CREATE OR REPLACE FUNCTION count_unique_visitors(start_date timestamptz)
RETURNS bigint AS $$
  SELECT COUNT(DISTINCT visitor_id)
  FROM page_views
  WHERE created_at >= start_date;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get device breakdown
CREATE OR REPLACE FUNCTION get_device_breakdown(start_date timestamptz)
RETURNS TABLE(device_type text, count bigint) AS $$
  SELECT
    COALESCE(device_type, 'unknown') as device_type,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
  GROUP BY device_type
  ORDER BY count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get top pages
CREATE OR REPLACE FUNCTION get_top_pages(start_date timestamptz, limit_count int)
RETURNS TABLE(page_path text, page_type text, count bigint) AS $$
  SELECT
    page_path,
    page_type,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
  GROUP BY page_path, page_type
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get top model profiles
CREATE OR REPLACE FUNCTION get_top_model_profiles(start_date timestamptz, limit_count int)
RETURNS TABLE(model_username text, count bigint) AS $$
  SELECT
    model_username,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
    AND page_type = 'profile'
    AND model_username IS NOT NULL
  GROUP BY model_username
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get daily views
CREATE OR REPLACE FUNCTION get_daily_views(start_date timestamptz)
RETURNS TABLE(date date, views bigint, visitors bigint) AS $$
  SELECT
    DATE(created_at) as date,
    COUNT(*) as views,
    COUNT(DISTINCT visitor_id) as visitors
  FROM page_views
  WHERE created_at >= start_date
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get browser breakdown
CREATE OR REPLACE FUNCTION get_browser_breakdown(start_date timestamptz)
RETURNS TABLE(browser text, count bigint) AS $$
  SELECT
    COALESCE(browser, 'Unknown') as browser,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
  GROUP BY browser
  ORDER BY count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get country breakdown
CREATE OR REPLACE FUNCTION get_country_breakdown(start_date timestamptz, limit_count int)
RETURNS TABLE(country text, count bigint) AS $$
  SELECT
    COALESCE(country, 'Unknown') as country,
    COUNT(*) as count
  FROM page_views
  WHERE created_at >= start_date
  GROUP BY country
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;
