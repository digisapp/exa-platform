-- ============================================================
-- Preserve the financial ledger when an auth user is deleted (2026-06-12)
--
-- actors.user_id and models.user_id reference auth.users ON DELETE CASCADE.
-- The purge-deleted-accounts cron anonymizes the model row "for financial
-- record integrity" and then calls auth.admin.deleteUser(). That delete
-- cascades: auth.users -> actors (and models) -> coin_transactions /
-- withdrawal_requests / payoneer_payouts (all ON DELETE CASCADE), wiping the
-- entire coin ledger and payout history the cron intended to keep.
--
-- Fix: relax these two FKs to ON DELETE SET NULL. Deleting the login then just
-- detaches the (already anonymized) actor/model row from auth — the row and its
-- financial records survive. Nothing in the app depends on the cascade; both
-- columns are nullable and UNIQUE (Postgres allows multiple NULLs).
--
-- NOTE: this does NOT address the self-delete path, where /api/auth/delete-account
-- hard-deletes fan/brand actor rows directly (cascading their ledger). That needs
-- a separate change (soft-delete + money-table constraints) and is tracked apart.
-- ============================================================
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.conrelid IN ('public.actors'::regclass, 'public.models'::regclass)
      AND a.attname = 'user_id'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', con.tbl, con.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (user_id) '
      || 'REFERENCES auth.users(id) ON DELETE SET NULL',
      con.tbl, con.conname
    );
  END LOOP;
END $$;
