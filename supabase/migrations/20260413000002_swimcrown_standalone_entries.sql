-- Allow SwimCrown entries without an EXA account
-- Add contact fields directly on contestants table, make model_id nullable

ALTER TABLE public.swimcrown_contestants
  ALTER COLUMN model_id DROP NOT NULL;

ALTER TABLE public.swimcrown_contestants
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Drop the unique constraint on (competition_id, model_id) since model_id can be null
-- Replace with a unique constraint on (competition_id, email) for standalone entries
ALTER TABLE public.swimcrown_contestants
  DROP CONSTRAINT IF EXISTS swimcrown_contestants_competition_id_model_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS swimcrown_contestants_comp_email_unique
  ON public.swimcrown_contestants (competition_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS swimcrown_contestants_comp_model_unique
  ON public.swimcrown_contestants (competition_id, model_id)
  WHERE model_id IS NOT NULL;
