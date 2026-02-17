-- Comp card lead capture table for the public free comp card tool
CREATE TABLE IF NOT EXISTS public.comp_card_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text,
  ip_address text,
  download_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: deny all direct access (only service role inserts)
ALTER TABLE public.comp_card_leads ENABLE ROW LEVEL SECURITY;
