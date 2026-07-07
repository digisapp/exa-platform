-- Security hardening for client-callable SECURITY DEFINER surfaces.
--
-- 1) get_unlocked_media_urls trusted its p_buyer_id argument for the
--    "buyer has unlocked this" checks. Because the function is EXECUTE-able by
--    authenticated (it must be — /api/content calls it with the user session
--    client), any logged-in user could pass another purchaser's actor id and
--    receive raw media_url values for content they never bought. Bind the buyer
--    to the authenticated caller's own actor id derived from auth.uid();
--    p_buyer_id is kept in the signature for call-site compatibility but ignored.
--
-- 2) The transaction-aggregation RPCs (earnings / revenue / top purchasers) are
--    SECURITY DEFINER and are called from client pages with the user session, so
--    they can't simply be REVOKEd. Instead they now enforce authorization
--    INSIDE the function: earnings summaries are visible only to the actor who
--    owns them (or an admin); platform-wide stats and the purchaser list are
--    admin-only. Unauthorized callers get an empty result set instead of another
--    actor's earnings or the platform whale list.

-- ── 1. PPV unlocked-media lookup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unlocked_media_urls(
  p_content_ids uuid[],
  p_buyer_id uuid
)
RETURNS TABLE(content_id uuid, media_url text) AS $$
DECLARE
  v_caller_actor_id uuid;
BEGIN
  -- The buyer is ALWAYS the authenticated caller, never the passed argument.
  SELECT a.id INTO v_caller_actor_id
  FROM public.actors a
  WHERE a.user_id = auth.uid();

  RETURN QUERY
  SELECT ci.id AS content_id, ci.media_url
  FROM public.content_items ci
  WHERE ci.id = ANY(p_content_ids)
    AND ci.status = 'exclusive'
    AND (
      -- Owner (model) always sees their content
      EXISTS (
        SELECT 1 FROM public.models m
        WHERE m.id = ci.model_id AND m.user_id = auth.uid()
      )
      -- Admin sees all
      OR EXISTS (
        SELECT 1 FROM public.actors a
        WHERE a.user_id = auth.uid() AND a.type = 'admin'
      )
      -- Caller has unlocked this item directly
      OR EXISTS (
        SELECT 1 FROM public.content_purchases cp
        WHERE cp.item_id = ci.id AND cp.buyer_id = v_caller_actor_id
      )
      -- Caller has unlocked the set this item belongs to
      OR (ci.set_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.content_purchases cp
        WHERE cp.set_id = ci.set_id AND cp.buyer_id = v_caller_actor_id
      ))
      -- Free content
      OR ci.coin_price = 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2a. Per-actor earnings summary — owner or admin only ────────────────────
CREATE OR REPLACE FUNCTION public.get_earnings_summary(p_actor_id uuid)
RETURNS TABLE(
  action text,
  total_amount bigint,
  this_month_amount bigint
) AS $$
  SELECT
    ct.action,
    COALESCE(SUM(ct.amount), 0)::bigint AS total_amount,
    COALESCE(SUM(CASE
      WHEN ct.created_at >= (now() - interval '1 month')
      THEN ct.amount ELSE 0
    END), 0)::bigint AS this_month_amount
  FROM public.coin_transactions ct
  WHERE ct.actor_id = p_actor_id
    AND ct.amount > 0
    AND (
      EXISTS (SELECT 1 FROM public.actors a WHERE a.id = p_actor_id AND a.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin')
    )
  GROUP BY ct.action;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_earnings_by_month(
  p_actor_id uuid,
  p_months int DEFAULT 6
)
RETURNS TABLE(
  month text,
  total_amount bigint
) AS $$
  SELECT
    to_char(ct.created_at, 'YYYY-MM') AS month,
    COALESCE(SUM(ct.amount), 0)::bigint AS total_amount
  FROM public.coin_transactions ct
  WHERE ct.actor_id = p_actor_id
    AND ct.amount > 0
    AND ct.created_at >= (now() - (p_months || ' months')::interval)
    AND (
      EXISTS (SELECT 1 FROM public.actors a WHERE a.id = p_actor_id AND a.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin')
    )
  GROUP BY to_char(ct.created_at, 'YYYY-MM')
  ORDER BY month ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── 2b. Platform-wide stats — admin only ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_transaction_stats()
RETURNS TABLE(
  stat_name text,
  stat_value bigint
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT 'total_purchased'::text, COALESCE(SUM(amount), 0)::bigint
    FROM public.coin_transactions WHERE action = 'purchase'
  UNION ALL
  SELECT 'total_tipped'::text, COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM public.coin_transactions WHERE action = 'tip_sent'
  UNION ALL
  SELECT 'total_content_sales'::text, COALESCE(SUM(amount), 0)::bigint
    FROM public.coin_transactions WHERE action = 'content_sale';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_top_purchasers(p_limit int DEFAULT 20)
RETURNS TABLE(
  actor_id uuid,
  total_purchased bigint,
  purchase_count bigint
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    ct.actor_id,
    COALESCE(SUM(ct.amount), 0)::bigint AS total_purchased,
    COUNT(*)::bigint AS purchase_count
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase'
  GROUP BY ct.actor_id
  ORDER BY total_purchased DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_purchase_volume()
RETURNS TABLE(
  coin_amount int,
  purchase_count bigint
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    ct.amount AS coin_amount,
    COUNT(*)::bigint AS purchase_count
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase'
  GROUP BY ct.amount
  ORDER BY purchase_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
