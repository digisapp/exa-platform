-- Fix get_top_model_profiles to only include actual model usernames
-- Previously it was returning page views for routes like /forgot-password, /confirm-email
-- because they were tracked with page_type='profile' but aren't actual models

CREATE OR REPLACE FUNCTION get_top_model_profiles(start_date timestamptz, limit_count int)
RETURNS TABLE(model_username text, count bigint) AS $$
  SELECT
    pv.model_username,
    COUNT(*) as count
  FROM page_views pv
  INNER JOIN models m ON m.username = pv.model_username
  WHERE pv.created_at >= start_date
    AND pv.page_type = 'profile'
    AND pv.model_username IS NOT NULL
  GROUP BY pv.model_username
  ORDER BY count DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION get_top_model_profiles IS 'Returns top viewed model profiles, filtered to only include actual models from the models table';
