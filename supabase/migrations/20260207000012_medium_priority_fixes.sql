-- Medium priority fixes: state transition constraints

-- 1. Enforce valid state transitions for withdrawal_requests
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot change status of completed withdrawal';
  END IF;
  IF OLD.status = 'failed' AND NEW.status NOT IN ('failed', 'processing') THEN
    RAISE EXCEPTION 'Failed withdrawals can only be retried (set to processing)';
  END IF;
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of cancelled withdrawal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER enforce_withdrawal_status
  BEFORE UPDATE OF status ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_status_transition();

-- 2. Add check constraint on offer_responses for responded_at consistency
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_response_timestamp') THEN
    ALTER TABLE public.offer_responses ADD CONSTRAINT valid_response_timestamp
    CHECK (
      (status IN ('pending') AND responded_at IS NULL) OR
      (status NOT IN ('pending') AND responded_at IS NOT NULL)
    );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add offer_responses constraint: %', SQLERRM;
END $$;

-- 3. Add idempotency_key column to coin_transactions to prevent duplicate transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'coin_transactions'
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.coin_transactions ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX idx_coin_transactions_idempotency
      ON public.coin_transactions(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;
