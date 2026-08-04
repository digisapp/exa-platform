-- Platform infrastructure cost tracking for the admin Costs dashboard.
-- Fixed subscription line items live here (editable in /admin/costs);
-- variable costs (Vercel build usage, Stripe fees) are computed live by
-- /api/admin/costs and are NOT stored.

CREATE TABLE public.platform_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  label TEXT NOT NULL,
  monthly_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_cost_cents >= 0),
  notes TEXT,
  billing_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_costs_sort ON public.platform_costs (sort_order, created_at);

CREATE OR REPLACE FUNCTION public.set_platform_costs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER platform_costs_updated_at
  BEFORE UPDATE ON public.platform_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_costs_updated_at();

-- RLS: admins manage in the dashboard; app reads/writes go through the
-- service role only (same convention as booking_inquiries).
ALTER TABLE public.platform_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform_costs"
  ON public.platform_costs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

CREATE POLICY "Service role full access to platform_costs"
  ON public.platform_costs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Seed the known stack. Amounts with "confirm plan" notes are best-guess
-- defaults meant to be corrected in the admin UI, not authoritative.
INSERT INTO public.platform_costs (service, label, monthly_cost_cents, notes, billing_url, sort_order) VALUES
  ('vercel',   'Vercel Pro (1 seat)',   2000, 'Base plan. Build-machine usage is computed live above.', 'https://vercel.com/digis/~/settings/billing', 10),
  ('supabase', 'Supabase Pro',          2500, 'Org "Digis" verified on Pro 2026-08-04. Excludes usage overages.', 'https://supabase.com/dashboard/org/cwbgholftuxfufswngch/billing', 20),
  ('resend',   'Resend',                2000, 'Confirm plan — set to 0 if on free tier.', 'https://resend.com/settings/billing', 30),
  ('upstash',  'Upstash Redis',            0, 'Pay-as-you-go; typically under $1/mo.', 'https://console.upstash.com/', 40),
  ('livekit',  'LiveKit Cloud',            0, 'Confirm plan — free tier unless calls/streams grew.', 'https://cloud.livekit.io/', 50),
  ('twilio',   'Twilio SMS',               0, 'Not configured in Vercel — SMS is a silent no-op.', 'https://console.twilio.com/', 60),
  ('domains',  'Domains (GoDaddy etc.)',   0, 'Enter your annual domain total divided by 12.', 'https://account.godaddy.com/products', 70);
