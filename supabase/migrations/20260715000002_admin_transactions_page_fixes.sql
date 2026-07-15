-- Admin /admin/transactions page fixes:
--
-- 1. get_purchase_revenue(): exact revenue from metadata.amount_paid (the
--    actual Stripe charge stored by the checkout webhook) instead of the
--    page's package-price matching, which counts any purchase that doesn't
--    match a current COIN_PACKAGES entry as $0 and rewrites history when
--    package prices change. As of 2026-07-15 all 87 purchase rows carry
--    amount_paid; missing_amount_count is returned so the page can flag if
--    that ever stops being true.
--
-- 2. get_top_purchasers(): adds total_usd_cents (sum of amount_paid) so the
--    page can show real dollars instead of the coins*10 approximation.
--
-- 3. get_admin_transaction_stats(): total_tipped now includes Live Wall tips
--    (live_wall_tip_sent). All tips ever sent to date are Live Wall tips, so
--    the card previously showed 0 against 161 real tips.
--
-- All functions keep the admin-gated SECURITY DEFINER pattern from
-- 20260708000003 (return empty unless caller is an admin actor).

CREATE OR REPLACE FUNCTION public.get_purchase_revenue()
RETURNS TABLE(
  revenue_cents bigint,
  missing_amount_count bigint
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    COALESCE(SUM((ct.metadata->>'amount_paid')::bigint) FILTER (WHERE ct.metadata ? 'amount_paid'), 0)::bigint,
    COUNT(*) FILTER (WHERE NOT (ct.metadata ? 'amount_paid'))::bigint
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.get_purchase_revenue() FROM anon;

-- Return type changes (new column), so drop first.
DROP FUNCTION IF EXISTS public.get_top_purchasers(int);

CREATE FUNCTION public.get_top_purchasers(p_limit int DEFAULT 20)
RETURNS TABLE(
  actor_id uuid,
  total_purchased bigint,
  purchase_count bigint,
  total_usd_cents bigint
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.actors a WHERE a.user_id = auth.uid() AND a.type = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    ct.actor_id,
    COALESCE(SUM(ct.amount), 0)::bigint AS total_purchased,
    COUNT(*)::bigint AS purchase_count,
    COALESCE(SUM((ct.metadata->>'amount_paid')::bigint) FILTER (WHERE ct.metadata ? 'amount_paid'), 0)::bigint AS total_usd_cents
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase'
  GROUP BY ct.actor_id
  ORDER BY total_purchased DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.get_top_purchasers(int) FROM anon;

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
    FROM public.coin_transactions WHERE action IN ('tip_sent', 'live_wall_tip_sent')
  UNION ALL
  SELECT 'total_content_sales'::text, COALESCE(SUM(amount), 0)::bigint
    FROM public.coin_transactions WHERE action = 'content_sale';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
