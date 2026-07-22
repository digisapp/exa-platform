-- Weighted-random discovery sample for the fan dashboard "For You" feed.
--
-- The feed previously sampled only the newest 400 free items (64 models, ~2 new
-- items/day) — 92% of the ~5k-item catalog and ~520 models could never appear,
-- so fans saw the same pictures on every visit. This function samples the ENTIRE
-- eligible free catalog instead.
--
-- Weighting (Efraimidis–Spirakis: ORDER BY random()^(1/w) DESC = weighted
-- sampling without replacement):
--   * admin rating tier: 5★ ×4, 4★ ×2, 3★ ×1; tier <= 2 excluded outright
--     (same convention as /models and the Spotlight deck, PR #157)
--   * freshness: content < 14 days old ×2, so new uploads still surface
--
-- SECURITY INVOKER on purpose: callers see only what content_items/models RLS
-- already grants them — this adds no new read surface beyond the feed's
-- existing PostgREST queries.
CREATE OR REPLACE FUNCTION public.get_feed_discovery_sample(p_limit integer DEFAULT 300)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  media_type text,
  preview_url text,
  media_url text,
  coin_price integer,
  unlock_count integer,
  like_count integer,
  created_at timestamptz,
  model json
)
LANGUAGE sql
VOLATILE
AS $$
  SELECT
    ci.id, ci.title, ci.description, ci.media_type, ci.preview_url, ci.media_url,
    ci.coin_price, ci.unlock_count, ci.like_count, ci.created_at,
    json_build_object(
      'id', m.id,
      'username', m.username,
      'profile_photo_url', m.profile_photo_url,
      'is_verified', m.is_verified,
      'is_approved', m.is_approved,
      'deleted_at', m.deleted_at,
      'deactivated', m.deactivated
    ) AS model
  FROM public.content_items ci
  JOIN public.models m ON m.id = ci.model_id
  WHERE ci.status IN ('portfolio', 'exclusive')
    AND ci.coin_price = 0
    AND m.is_approved = true
    AND m.deleted_at IS NULL
    AND m.deactivated IS NOT TRUE
    AND m.rating_tier >= 3
  ORDER BY power(random(), 1.0 / (
    (CASE m.rating_tier WHEN 5 THEN 4.0 WHEN 4 THEN 2.0 ELSE 1.0 END)
    * (CASE WHEN ci.created_at > now() - interval '14 days' THEN 2.0 ELSE 1.0 END)
  )) DESC
  LIMIT GREATEST(p_limit, 1)
$$;

-- Dashboard is auth-gated; no reason for anon to sample the catalog.
REVOKE ALL ON FUNCTION public.get_feed_discovery_sample(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_discovery_sample(integer) TO authenticated, service_role;
