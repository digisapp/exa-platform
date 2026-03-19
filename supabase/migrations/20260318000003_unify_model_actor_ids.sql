-- Migration: Unify models.id with actors.id
--
-- Problem: 283 of 857 claimed models have models.id != actors.id (33%)
-- This creates confusion with three different ID types (user_id, actor_id, model_id).
--
-- Solution: Update models.id to match actors.id for all mismatched rows,
-- cascading the change to all FK-referencing tables.
--
-- Safety: storage_path and url columns are NOT modified — files remain accessible
-- at their original storage locations. Only the model_id reference columns are updated.
-- No explicit BEGIN/COMMIT — Supabase CLI auto-wraps migrations in a transaction.

-- Step 1: Create mapping of old model IDs to new (actor) IDs
CREATE TEMP TABLE model_id_mapping AS
SELECT m.id AS old_id, a.id AS new_id
FROM public.models m
JOIN public.actors a ON m.user_id = a.user_id
WHERE m.id != a.id
  AND m.user_id IS NOT NULL;

-- Step 2: Pre-flight conflict checks
DO $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check 1: new_id must not already exist as a models.id
  SELECT COUNT(*) INTO conflict_count
  FROM model_id_mapping mm
  JOIN public.models m ON m.id = mm.new_id;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Found % new IDs that already exist as model IDs', conflict_count;
  END IF;

  -- Check 2: Verify no duplicate new_ids in the mapping (would mean two models share a user_id)
  SELECT COUNT(*) INTO conflict_count
  FROM (
    SELECT new_id FROM model_id_mapping GROUP BY new_id HAVING COUNT(*) > 1
  ) dupes;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Found % duplicate actor IDs in mapping — data corruption', conflict_count;
  END IF;

  -- Check 3: Verify no PK/UNIQUE conflicts in child tables that use model_id as PK
  -- (top_models_stats, model_analytics/lifestyle_activity_summaries)
  -- These would fail if a row with new_id already exists
  DECLARE
    tbl TEXT;
    child_conflicts INTEGER;
  BEGIN
    FOR tbl IN
      SELECT rel.relname
      FROM pg_constraint con
      JOIN pg_class rel ON con.conrelid = rel.oid
      JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE con.confrelid = 'public.models'::regclass
        AND con.contype = 'f'
        AND nsp.nspname = 'public'
        AND att.attname = 'model_id'
        -- Only check tables where model_id has a PK or UNIQUE constraint
        AND EXISTS (
          SELECT 1 FROM pg_constraint uc
          WHERE uc.conrelid = con.conrelid
            AND uc.contype IN ('p', 'u')
            AND att.attnum = ANY(uc.conkey)
        )
    LOOP
      EXECUTE format(
        'SELECT COUNT(*) FROM public.%I existing
         JOIN model_id_mapping mm ON existing.model_id = mm.new_id',
        tbl
      ) INTO child_conflicts;

      IF child_conflicts > 0 THEN
        RAISE EXCEPTION 'ABORT: % rows in %.model_id would conflict with new IDs (PK/UNIQUE violation)',
          child_conflicts, tbl;
      END IF;
    END LOOP;
  END;
END $$;

-- Step 3: Drop all FK constraints referencing models(id),
-- update the referencing columns, update models.id, then re-add constraints.
DO $$
DECLARE
  r RECORD;
  constraint_defs TEXT[] := '{}';
  def TEXT;
  update_count INTEGER;
  mapping_count INTEGER;
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM model_id_mapping;
  RAISE NOTICE 'Unifying % mismatched model IDs with actor IDs', mapping_count;

  IF mapping_count = 0 THEN
    RAISE NOTICE 'No mismatched IDs found — nothing to do';
    RETURN;
  END IF;

  -- Collect all FK constraints referencing models(id)
  -- Use DISTINCT ON to avoid duplicates from composite keys
  FOR r IN
    SELECT DISTINCT ON (con.conname)
      con.conname AS constraint_name,
      rel.relname AS table_name,
      att.attname AS column_name,
      pg_get_constraintdef(con.oid) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.confrelid = 'public.models'::regclass
      AND con.contype = 'f'
      AND nsp.nspname = 'public'
    ORDER BY con.conname
  LOOP
    -- Save constraint definition for re-creation
    constraint_defs := array_append(constraint_defs,
      format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',
        r.table_name, r.constraint_name, r.constraint_def));

    -- Drop the constraint
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',
      r.table_name, r.constraint_name);
    RAISE NOTICE 'Dropped FK: %.%', r.table_name, r.constraint_name;

    -- Update the referencing column
    EXECUTE format(
      'UPDATE public.%I t SET %I = mm.new_id FROM model_id_mapping mm WHERE t.%I = mm.old_id',
      r.table_name, r.column_name, r.column_name);
    GET DIAGNOSTICS update_count = ROW_COUNT;
    IF update_count > 0 THEN
      RAISE NOTICE 'Updated % rows in %.%', update_count, r.table_name, r.column_name;
    END IF;
  END LOOP;

  -- Update the models.id primary key
  ALTER TABLE public.models DROP CONSTRAINT models_pkey;
  RAISE NOTICE 'Dropped models primary key';

  UPDATE public.models m
  SET id = mm.new_id
  FROM model_id_mapping mm
  WHERE m.id = mm.old_id;
  GET DIAGNOSTICS update_count = ROW_COUNT;
  RAISE NOTICE 'Updated % model IDs', update_count;

  ALTER TABLE public.models ADD CONSTRAINT models_pkey PRIMARY KEY (id);
  RAISE NOTICE 'Re-added models primary key';

  -- Re-add all FK constraints
  FOREACH def IN ARRAY constraint_defs
  LOOP
    EXECUTE def;
  END LOOP;
  RAISE NOTICE 'Re-added all % FK constraints', array_length(constraint_defs, 1);

  -- Final verification — ensure zero mismatches remain
  SELECT COUNT(*) INTO remaining
  FROM public.models m
  JOIN public.actors a ON m.user_id = a.user_id
  WHERE m.id != a.id AND m.user_id IS NOT NULL;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Verification failed: % models still have mismatched IDs', remaining;
  END IF;
  RAISE NOTICE 'Verification passed: all claimed models now have models.id = actors.id';
END $$;

DROP TABLE IF EXISTS model_id_mapping;
