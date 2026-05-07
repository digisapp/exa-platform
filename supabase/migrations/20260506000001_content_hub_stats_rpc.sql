-- Single-roundtrip content hub stats aggregation.
-- Replaces a 3-query JS reduce pipeline that scaled linearly with item count.

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
      SELECT id, title, media_type, coin_price, unlock_count
      FROM public.content_items
      WHERE model_id = p_model_id
      ORDER BY unlock_count DESC NULLS LAST
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
  )
  SELECT json_build_object(
    'total_items', item_stats.total_items,
    'portfolio_count', item_stats.portfolio_count,
    'exclusive_count', item_stats.exclusive_count,
    'private_count', item_stats.private_count,
    'scheduled_count', item_stats.scheduled_count,
    'total_unlocks', item_stats.total_unlocks,
    'total_revenue', (item_revenue.revenue + set_revenue.revenue),
    'top_items', top_items.items,
    'sets_count', set_count.sets_count
  )
  FROM item_stats, top_items, set_count, item_revenue, set_revenue;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_hub_stats(uuid) TO authenticated, service_role;
