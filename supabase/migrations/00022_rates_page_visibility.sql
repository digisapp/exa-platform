-- Add column for models to opt-in to the public rates directory page
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS show_on_rates_page boolean DEFAULT false;

COMMENT ON COLUMN public.models.show_on_rates_page IS 'Whether to show this model on the public /rates directory page';
