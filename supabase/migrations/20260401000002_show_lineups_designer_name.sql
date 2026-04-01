-- Allow lineups without a designers table record — admin just types a name
ALTER TABLE public.show_lineups
  ALTER COLUMN designer_id DROP NOT NULL,
  ADD COLUMN designer_name TEXT;

-- Drop the old unique constraint (event_id, designer_id)
ALTER TABLE public.show_lineups
  DROP CONSTRAINT show_lineups_event_id_designer_id_key;

-- Add new unique constraint on (event_id, designer_name)
ALTER TABLE public.show_lineups
  ADD CONSTRAINT show_lineups_event_id_designer_name_key UNIQUE (event_id, designer_name);
