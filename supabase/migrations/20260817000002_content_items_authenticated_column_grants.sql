-- ============================================================================
-- PHASE B1: content_items.media_url locked away from the authenticated role
-- ============================================================================
-- Phase A (20260810000001) closed the anon-key harvest of exclusive media
-- paths. But fan signup is self-serve: any logged-in account could still read
-- content_items.media_url for every Exclusive item via PostgREST — and legacy
-- (pre-20260712100002) exclusive items store PUBLIC portfolio-bucket URLs, so
-- that read is a fetch-the-paid-file-without-paying bypass.
--
-- Same mechanics as Phase A: revoke the table-level SELECT, re-grant every
-- column except media_url. RLS is unchanged; this controls columns, not rows.
-- Every authenticated-role reader of content_items was enumerated and moved to
-- the service role / API routes in the same deploy (FanDashboard, dashboard
-- portrait picker, my-content purchases embed, chat LibraryPicker, comp-card,
-- admin content pickers).
--
-- Lesson from Phase A applied up front: prod carried STRAY COLUMN-LEVEL grants
-- of media_url (4 grantor rows) that a table-level REVOKE does not remove —
-- so media_url is also revoked explicitly, per column.
-- ============================================================================

REVOKE SELECT ON public.content_items FROM authenticated;
REVOKE SELECT (media_url) ON public.content_items FROM authenticated;

GRANT SELECT (
  id,
  model_id,
  set_id,
  title,
  description,
  media_type,
  preview_url,
  status,
  coin_price,
  publish_at,
  position,
  tags,
  width,
  height,
  is_primary,
  view_count,
  unlock_count,
  like_count,
  legacy_premium_content_id,
  created_at,
  updated_at
) ON public.content_items TO authenticated;

-- ============================================================================
-- get_feed_discovery_sample: SECURITY INVOKER -> DEFINER
-- ============================================================================
-- The fan feed's discovery sample reads content_items.media_url (free items
-- only) and filters on models.rating_tier. As INVOKER it executed with the
-- caller's column privileges and would now fail. DEFINER is safe here: the
-- function's output is free items plus non-sensitive model fields, its WHERE
-- clause enforces its own gating (approved, not deleted, tier >= 3), and
-- rating_tier is consumed internally, never returned. Execution stays
-- restricted to authenticated + service_role (REVOKE from PUBLIC/anon
-- re-asserted below).

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
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.get_feed_discovery_sample(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_discovery_sample(integer) TO authenticated, service_role;
