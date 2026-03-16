-- Table to track Miami Digitals event bookings
CREATE TABLE IF NOT EXISTS public.miami_digitals_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  instagram text,
  is_digis_creator boolean DEFAULT false,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.miami_digitals_bookings ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can manage digitals bookings"
  ON public.miami_digitals_bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_miami_digitals_email ON public.miami_digitals_bookings(email);
CREATE INDEX IF NOT EXISTS idx_miami_digitals_status ON public.miami_digitals_bookings(status);
