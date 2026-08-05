-- Explore "Trending This Week" switches from Spotlight game points to real
-- profile traffic: models ranked by unique profile visitors over a trailing
-- window, from profile_views (already deduped at insert to one row per viewer
-- per day — logged-in by user, anon by IP; self-views never logged).
--
-- Admin viewers are excluded so internal browsing can't skew a thin
-- leaderboard (same principle as the analytics traffic RPCs). Anonymous
-- admin visits can't be identified and are accepted as noise.
--
-- Eligibility mirrors the Explore row's existing gates: approved, not
-- deleted/deactivated, has a photo, and rating_tier >= 3 — traffic must
-- never out-rank the admin brand-image gate. rating_tier is a non-null
-- generated column (unrated = 3), so a plain comparison is safe.
--
-- Service-role-only per the RPC lockdown convention: the /models server
-- component calls it via the service client. Visitor counts stay
-- server-side — traffic numbers are never fan-facing.
CREATE OR REPLACE FUNCTION public.get_trending_models_by_traffic(
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (id uuid, username text, profile_photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.username, m.profile_photo_url
  FROM public.profile_views pv
  JOIN public.models m ON m.id = pv.model_id
  WHERE pv.view_date >= (CURRENT_DATE - p_days)
    AND NOT EXISTS (
      SELECT 1 FROM public.actors a
      WHERE a.user_id = pv.viewer_id AND a.type = 'admin'
    )
    AND m.is_approved = true
    AND m.deleted_at IS NULL
    AND m.deactivated IS DISTINCT FROM true
    AND m.profile_photo_url IS NOT NULL
    AND m.rating_tier >= 3
  GROUP BY m.id, m.username, m.profile_photo_url, m.rating_tier, m.last_active_at
  ORDER BY
    COUNT(DISTINCT COALESCE(pv.viewer_id::text, pv.ip_address)) DESC,
    m.rating_tier DESC,
    m.last_active_at DESC NULLS LAST
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_trending_models_by_traffic(integer, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_models_by_traffic(integer, integer)
  TO service_role;
