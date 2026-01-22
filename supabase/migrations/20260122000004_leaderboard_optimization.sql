-- ============================================
-- LEADERBOARD OPTIMIZATION
-- ============================================
-- Creates efficient functions for leaderboard queries

-- Function to get weekly top models with aggregated points
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  model_id uuid,
  username text,
  first_name text,
  last_name text,
  profile_photo_url text,
  city text,
  state text,
  level_cached text,
  points_cached int,
  weekly_points bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as model_id,
    m.username,
    m.first_name,
    m.last_name,
    m.profile_photo_url,
    m.city,
    m.state,
    m.level_cached,
    m.points_cached,
    COALESCE(SUM(pt.points), 0)::bigint as weekly_points
  FROM public.models m
  LEFT JOIN public.point_transactions pt ON pt.model_id = m.id
    AND pt.created_at >= (now() - interval '7 days')
  WHERE m.is_approved = true
  GROUP BY m.id
  HAVING COALESCE(SUM(pt.points), 0) > 0
  ORDER BY weekly_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all-time top models (uses cached points for speed)
CREATE OR REPLACE FUNCTION public.get_alltime_leaderboard(
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  model_id uuid,
  username text,
  first_name text,
  last_name text,
  profile_photo_url text,
  city text,
  state text,
  level_cached text,
  points_cached int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as model_id,
    m.username,
    m.first_name,
    m.last_name,
    m.profile_photo_url,
    m.city,
    m.state,
    m.level_cached,
    m.points_cached
  FROM public.models m
  WHERE m.is_approved = true
    AND m.points_cached > 0
  ORDER BY m.points_cached DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create index for efficient weekly point aggregation
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_model
  ON public.point_transactions(created_at DESC, model_id);

-- Create index for leaderboard queries on models
CREATE INDEX IF NOT EXISTS idx_models_leaderboard
  ON public.models(is_approved, points_cached DESC)
  WHERE is_approved = true;
