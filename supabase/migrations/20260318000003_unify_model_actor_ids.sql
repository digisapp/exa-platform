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

BEGIN;

-- Step 1: Create mapping of old model IDs to new (actor) IDs
CREATE TEMP TABLE model_id_mapping AS
SELECT m.id AS old_id, a.id AS new_id
FROM public.models m
JOIN public.actors a ON m.user_id = a.user_id
WHERE m.id != a.id
  AND m.user_id IS NOT NULL;

-- Verify no conflicts (new_id must not already exist as a models.id)
DO $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM model_id_mapping mm
  JOIN public.models m ON m.id = mm.new_id;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Found % conflicting IDs — new actor IDs already exist as model IDs', conflict_count;
  END IF;
END $$;

-- Step 2: Dynamically drop all FK constraints referencing models(id),
-- update the referencing columns, then re-add the constraints.
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
  -- and store their full definitions for re-creation
  FOR r IN
    SELECT
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

  -- Step 3: Update the models.id primary key
  -- First drop the PK constraint
  ALTER TABLE public.models DROP CONSTRAINT models_pkey;
  RAISE NOTICE 'Dropped models primary key';

  -- Update models.id
  UPDATE public.models m
  SET id = mm.new_id
  FROM model_id_mapping mm
  WHERE m.id = mm.old_id;
  GET DIAGNOSTICS update_count = ROW_COUNT;
  RAISE NOTICE 'Updated % model IDs', update_count;

  -- Re-add primary key
  ALTER TABLE public.models ADD CONSTRAINT models_pkey PRIMARY KEY (id);
  RAISE NOTICE 'Re-added models primary key';

  -- Step 4: Re-add all FK constraints
  FOREACH def IN ARRAY constraint_defs
  LOOP
    EXECUTE def;
  END LOOP;
  RAISE NOTICE 'Re-added all % FK constraints', array_length(constraint_defs, 1);

  -- Step 5: Verification — ensure zero mismatches remain
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

COMMIT;
