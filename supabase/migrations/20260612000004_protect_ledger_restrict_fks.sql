-- ============================================================
-- Protect the coin ledger from deletion (2026-06-12)  [part 2 of 2]
--
-- Defense in depth for the financial ledger. coin_transactions, withdrawal_requests
-- and payoneer_payouts reference actors/models ON DELETE CASCADE, so deleting an
-- actor/model wiped the ledger. After 20260612000003 + the soft-delete code, no
-- code path hard-deletes actors/models anymore — so flip these FKs to ON DELETE
-- RESTRICT to make wiping the ledger by deletion structurally impossible.
--
-- These rows carry no PII (actor_id + amount + action), so retaining them is
-- GDPR-compatible; PII is scrubbed on the actor/fan/brand/model row by the purge
-- cron. APPLY ONLY AFTER the soft-delete code is live (the old hard-delete path
-- would otherwise hit RESTRICT mid-delete and leave a partial state).
-- ============================================================
DO $$
DECLARE
  spec record;
  con  record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('public.coin_transactions'::regclass,  'actor_id', 'public.actors'),
      ('public.withdrawal_requests'::regclass,'model_id', 'public.models'),
      ('public.payoneer_payouts'::regclass,   'model_id', 'public.models')
    ) AS t(tbl, col, reftbl)
  LOOP
    FOR con IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f'
        AND c.conrelid = spec.tbl
        AND a.attname = spec.col
        AND array_length(c.conkey, 1) = 1
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', spec.tbl, con.conname);
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) '
        || 'REFERENCES %s(id) ON DELETE RESTRICT',
        spec.tbl, con.conname, spec.col, spec.reftbl
      );
    END LOOP;
  END LOOP;
END $$;
