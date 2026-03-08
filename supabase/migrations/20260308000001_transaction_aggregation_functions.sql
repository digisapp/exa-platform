-- Transaction aggregation functions for performance optimization
-- Replaces client-side JS aggregation with database-level SUM/GROUP BY

-- 1. get_earnings_summary: Returns total + this-month amounts by action type for a given actor
-- Used by: Earnings page, Wallet page
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
  GROUP BY ct.action;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. get_earnings_by_month: Returns monthly totals for last N months
-- Used by: Wallet page monthly earnings chart
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
  GROUP BY to_char(ct.created_at, 'YYYY-MM')
  ORDER BY month ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. get_admin_transaction_stats: Platform-wide aggregated stats
-- Used by: Admin transactions page stats cards
CREATE OR REPLACE FUNCTION public.get_admin_transaction_stats()
RETURNS TABLE(
  stat_name text,
  stat_value bigint
) AS $$
  SELECT 'total_purchased'::text, COALESCE(SUM(amount), 0)::bigint
    FROM public.coin_transactions WHERE action = 'purchase'
  UNION ALL
  SELECT 'total_tipped'::text, COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM public.coin_transactions WHERE action = 'tip_sent'
  UNION ALL
  SELECT 'total_content_sales'::text, COALESCE(SUM(amount), 0)::bigint
    FROM public.coin_transactions WHERE action = 'content_sale';
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. get_top_purchasers: Top N purchasers with aggregated totals
-- Used by: Admin transactions page top purchasers tab
CREATE OR REPLACE FUNCTION public.get_top_purchasers(p_limit int DEFAULT 20)
RETURNS TABLE(
  actor_id uuid,
  total_purchased bigint,
  purchase_count bigint
) AS $$
  SELECT
    ct.actor_id,
    COALESCE(SUM(ct.amount), 0)::bigint AS total_purchased,
    COUNT(*)::bigint AS purchase_count
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase'
  GROUP BY ct.actor_id
  ORDER BY total_purchased DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. get_purchase_volume: Purchase counts grouped by coin amount (for revenue calculation)
-- Used by: Admin transactions page revenue stats
CREATE OR REPLACE FUNCTION public.get_purchase_volume()
RETURNS TABLE(
  coin_amount int,
  purchase_count bigint
) AS $$
  SELECT
    ct.amount AS coin_amount,
    COUNT(*)::bigint AS purchase_count
  FROM public.coin_transactions ct
  WHERE ct.action = 'purchase'
  GROUP BY ct.amount
  ORDER BY purchase_count DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Composite index to accelerate earnings aggregation queries
CREATE INDEX IF NOT EXISTS idx_coin_transactions_actor_action
  ON public.coin_transactions(actor_id, action)
  WHERE amount > 0;
