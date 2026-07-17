-- Country breakdown by UNIQUE visitors (real people), excluding internal traffic.
-- A visitor_id is "internal" if that device has ever been used while logged into
-- an admin account — this also catches the same device browsing under test/model/fan
-- accounts (e.g. the owner's own browsing skewing country stats).

CREATE OR REPLACE FUNCTION get_country_visitor_breakdown(start_date timestamptz, limit_count int)
RETURNS TABLE(country text, visitors bigint, views bigint) AS $$
  WITH internal_visitors AS (
    SELECT DISTINCT pv.visitor_id
    FROM page_views pv
    JOIN actors a ON a.user_id = pv.user_id
    WHERE a.type = 'admin'
  )
  SELECT
    COALESCE(pv.country, 'Unknown') AS country,
    COUNT(DISTINCT pv.visitor_id) AS visitors,
    COUNT(*) AS views
  FROM page_views pv
  WHERE pv.created_at >= start_date
    AND pv.visitor_id NOT IN (SELECT visitor_id FROM internal_visitors)
  GROUP BY 1
  ORDER BY visitors DESC, views DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin-only data; the analytics route calls this via the service-role client.
REVOKE EXECUTE ON FUNCTION get_country_visitor_breakdown(timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_country_visitor_breakdown(timestamptz, int) FROM anon;
REVOKE EXECUTE ON FUNCTION get_country_visitor_breakdown(timestamptz, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION get_country_visitor_breakdown(timestamptz, int) TO service_role;
