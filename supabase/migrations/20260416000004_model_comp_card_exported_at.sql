-- Track when a model exports a comp card from their dashboard
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS comp_card_exported_at timestamptz;
