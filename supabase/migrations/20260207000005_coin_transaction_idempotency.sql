-- Add idempotency key to coin_transactions to prevent duplicate charges
-- The unique index ensures the same action for the same actor+message can only happen once

ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Unique constraint: one action per actor per message (covers tips, ppv_unlock, message_sent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_idempotency
  ON public.coin_transactions (actor_id, message_id, action)
  WHERE message_id IS NOT NULL;

-- For non-message transactions, use the idempotency_key column
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_idempotency_key
  ON public.coin_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
