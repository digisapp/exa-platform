-- ============================================================
-- Soft-delete columns for fans/brands (2026-06-12)  [part 1 of 2]
--
-- /api/auth/delete-account hard-deleted fan/brand actor rows, cascade-wiping
-- their coin_transactions ledger (a debt fan could delete to erase what they
-- owe). Give fans/brands the same soft-delete columns models already have
-- (20260407000001) so delete-account can soft-delete and the purge cron can
-- anonymize them instead. Purely additive — safe to apply before the code ships.
--
-- Part 2 (FK CASCADE -> RESTRICT on the money tables) ships in a SEPARATE
-- migration applied AFTER the new soft-delete code is live, so it can't trip the
-- old hard-delete path mid-deploy.
-- ============================================================
ALTER TABLE public.fans  ADD COLUMN IF NOT EXISTS deleted_at     timestamptz DEFAULT NULL;
ALTER TABLE public.fans  ADD COLUMN IF NOT EXISTS deleted_reason text        DEFAULT NULL;
ALTER TABLE public.fans  ADD COLUMN IF NOT EXISTS purged_at      timestamptz DEFAULT NULL;

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS deleted_at     timestamptz DEFAULT NULL;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS deleted_reason text        DEFAULT NULL;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS purged_at      timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_fans_pending_purge
  ON public.fans (deleted_at) WHERE deleted_at IS NOT NULL AND purged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brands_pending_purge
  ON public.brands (deleted_at) WHERE deleted_at IS NOT NULL AND purged_at IS NULL;

-- fans.user_id -> auth.users is still ON DELETE CASCADE (20260612000002 only
-- covered actors/models). Relax to SET NULL so the purge cron's deleteUser
-- detaches (keeps) the anonymized fan row, mirroring models. Additive/safe.
-- (brands have no user_id; they ride on actors.user_id, already SET NULL.)
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.fans'::regclass
      AND a.attname = 'user_id'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.fans DROP CONSTRAINT %I', con.conname);
    EXECUTE format(
      'ALTER TABLE public.fans ADD CONSTRAINT %I FOREIGN KEY (user_id) '
      || 'REFERENCES auth.users(id) ON DELETE SET NULL',
      con.conname
    );
  END LOOP;
END $$;

COMMENT ON COLUMN public.fans.deleted_at   IS 'When the fan initiated account deletion (soft delete)';
COMMENT ON COLUMN public.fans.purged_at    IS 'When personal data was permanently purged';
COMMENT ON COLUMN public.brands.deleted_at IS 'When the brand initiated account deletion (soft delete)';
COMMENT ON COLUMN public.brands.purged_at  IS 'When personal data was permanently purged';
