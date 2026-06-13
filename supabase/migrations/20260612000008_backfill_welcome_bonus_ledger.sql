-- Backfill missing welcome-bonus ledger rows.
--
-- Fan signup grants 10 coins, but both creation paths inserted the
-- signup_bonus ledger row with the user's session client. coin_transactions
-- has no INSERT policy for authenticated users, so RLS silently rejected the
-- insert: every such fan holds a balance with no ledger row behind it
-- (ledger-sum invariant off by exactly +10). The signup bonus has since been
-- removed entirely (2026-06-12, product decision); existing fans keep the
-- coins they were granted, and this repairs their ledger to match.
--
-- Precision guard: only fans whose balance exceeds their ledger sum by
-- EXACTLY 10 and who have no signup_bonus row. Fans that don't match are
-- left untouched. Rows are stamped with the fan's created_at and a backfill
-- marker in metadata so they're auditable (and removable by marker).

INSERT INTO public.coin_transactions (actor_id, amount, action, metadata, created_at)
SELECT
  f.id,
  10,
  'signup_bonus',
  jsonb_build_object(
    'reason', 'Welcome bonus for new signup',
    'backfill', '20260612000008'
  ),
  f.created_at
FROM public.fans f
LEFT JOIN (
  SELECT actor_id, SUM(amount) AS total
  FROM public.coin_transactions
  GROUP BY actor_id
) t ON t.actor_id = f.id
WHERE f.coin_balance - COALESCE(t.total, 0) = 10
  AND NOT EXISTS (
    SELECT 1 FROM public.coin_transactions ct
    WHERE ct.actor_id = f.id
      AND ct.action = 'signup_bonus'
  );
