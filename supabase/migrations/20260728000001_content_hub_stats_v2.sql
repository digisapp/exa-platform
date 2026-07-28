-- Content hub stats v2.
--  * top_items revenue comes from content_purchases (what fans actually paid),
--    so later price changes no longer rewrite history; rows also carry
--    preview_url so the Studio can render thumbnails without a client-side
--    lookup against the (possibly filtered) grid.
--  * Items with zero unlocks are excluded from top_items — a "top" list of
--    0-unlock rows was noise.
--  * revenue_30d / unlocks_30d give the Stats tab a time dimension.
--  * Service-role-only: the function returns revenue for an arbitrary
--    p_model_id and is only ever called through the service client in
--    /api/content-hub/stats.

CREATE OR REPLACE FUNCTION public.get_content_hub_stats(p_model_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH item_stats AS (
    SELECT
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE status = 'portfolio') AS portfolio_count,
      COUNT(*) FILTER (WHERE status = 'exclusive') AS exclusive_count,
      COUNT(*) FILTER (WHERE status = 'private') AS private_count,
      COUNT(*) FILTER (WHERE publish_at IS NOT NULL AND publish_at > now()) AS scheduled_count,
      COALESCE(SUM(unlock_count), 0)::bigint AS total_unlocks
    FROM public.content_items
    WHERE model_id = p_model_id
  ),
  top_items AS (
    SELECT COALESCE(json_agg(t ORDER BY t.unlock_count DESC), '[]'::json) AS items
    FROM (
      SELECT
        ci.id,
        ci.title,
        ci.media_type,
        ci.coin_price,
        ci.unlock_count,
        ci.preview_url,
        COALESCE((
          SELECT SUM(cp.coins_spent)
          FROM public.content_purchases cp
          WHERE cp.item_id = ci.id
        ), 0)::bigint AS revenue
      FROM public.content_items ci
      WHERE ci.model_id = p_model_id
        AND ci.unlock_count > 0
      ORDER BY ci.unlock_count DESC NULLS LAST
      LIMIT 5
    ) t
  ),
  set_count AS (
    SELECT COUNT(*) AS sets_count
    FROM public.content_sets
    WHERE model_id = p_model_id
  ),
  item_revenue AS (
    SELECT COALESCE(SUM(cp.coins_spent), 0)::bigint AS revenue
    FROM public.content_purchases cp
    INNER JOIN public.content_items ci ON cp.item_id = ci.id
    WHERE ci.model_id = p_model_id
  ),
  set_revenue AS (
    SELECT COALESCE(SUM(cp.coins_spent), 0)::bigint AS revenue
    FROM public.content_purchases cp
    INNER JOIN public.content_sets cs ON cp.set_id = cs.id
    WHERE cs.model_id = p_model_id
  ),
  last_30d AS (
    SELECT
      COALESCE(SUM(cp.coins_spent), 0)::bigint AS revenue,
      COUNT(*)::bigint AS unlocks
    FROM public.content_purchases cp
    LEFT JOIN public.content_items ci ON cp.item_id = ci.id
    LEFT JOIN public.content_sets cs ON cp.set_id = cs.id
    WHERE (ci.model_id = p_model_id OR cs.model_id = p_model_id)
      AND cp.created_at >= now() - interval '30 days'
  )
  SELECT json_build_object(
    'total_items', item_stats.total_items,
    'portfolio_count', item_stats.portfolio_count,
    'exclusive_count', item_stats.exclusive_count,
    'private_count', item_stats.private_count,
    'scheduled_count', item_stats.scheduled_count,
    'total_unlocks', item_stats.total_unlocks,
    'total_revenue', (item_revenue.revenue + set_revenue.revenue),
    'revenue_30d', last_30d.revenue,
    'unlocks_30d', last_30d.unlocks,
    'top_items', top_items.items,
    'sets_count', set_count.sets_count
  )
  FROM item_stats, top_items, set_count, item_revenue, set_revenue, last_30d;
$$;

-- Revenue for an arbitrary model id must not be readable by any logged-in
-- user; the stats route authenticates and calls this via the service client.
REVOKE EXECUTE ON FUNCTION public.get_content_hub_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_hub_stats(uuid) TO service_role;
