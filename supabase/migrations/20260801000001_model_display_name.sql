-- Opt-in public display name for models.
--
-- Deliberately a NEW column, separate from first_name/last_name (which are
-- admin-only PII and never selected in non-admin queries): the model types
-- this value in herself in Settings, with copy stating it becomes public and
-- searchable. NULL = show @username only, which is the status quo for every
-- existing profile. Only claimed models can set it (unclaimed imports have no
-- auth user to edit settings). Written via the models self-update RLS path;
-- authenticated retains table-wide UPDATE so no grant changes are needed.
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS display_name text
  CONSTRAINT models_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 50);
