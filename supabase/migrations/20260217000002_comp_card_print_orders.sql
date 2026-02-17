-- Comp card print orders for the public free comp card print & pick up feature
CREATE TABLE IF NOT EXISTS public.comp_card_print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  phone text,
  pdf_url text,
  storage_path text,
  quantity integer NOT NULL,
  package_name text NOT NULL,
  amount_cents integer NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','printing','ready','picked_up','cancelled')),
  pickup_location text DEFAULT 'EXA Studio - Miami',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_print_orders_status ON public.comp_card_print_orders(status);
CREATE INDEX idx_print_orders_created ON public.comp_card_print_orders(created_at DESC);

-- RLS: deny all direct access (only service role operates on this table)
ALTER TABLE public.comp_card_print_orders ENABLE ROW LEVEL SECURITY;
