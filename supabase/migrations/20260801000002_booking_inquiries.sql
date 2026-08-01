-- Booking inquiries: agency-style "Book this model" leads from the public
-- /models roster and model profiles. No account required — the roster link is
-- shared with casting directors / brands who browse anonymously and inquire;
-- the EXA team qualifies and mediates every lead (models are NOT notified
-- directly). Distinct from the authenticated fan->model `bookings` flow.
-- Same lead-table conventions as tour_applications: service-role-only public
-- writes, admin-managed in the dashboard.

CREATE TABLE public.booking_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL for a general "help me find talent" inquiry from the /models header.
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  -- Snapshot so the lead stays readable if the model renames or is deleted.
  model_username TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN (
    'photoshoot', 'runway', 'event', 'campaign', 'content', 'other'
  )),
  -- Free text on purpose: clients write "mid-September" / "TBD".
  event_date TEXT,
  location TEXT,
  budget_range TEXT CHECK (budget_range IN (
    'under_1k', '1k_5k', '5k_15k', '15k_plus', 'discuss'
  )),
  details TEXT,
  -- Which surface produced the lead: 'card' | 'profile' | 'explore_header'.
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'booked', 'closed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_inquiries_created_at ON public.booking_inquiries (created_at DESC);
CREATE INDEX idx_booking_inquiries_status ON public.booking_inquiries (status);
CREATE INDEX idx_booking_inquiries_model ON public.booking_inquiries (model_id);

CREATE OR REPLACE FUNCTION public.set_booking_inquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_inquiries_updated_at
  BEFORE UPDATE ON public.booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_inquiries_updated_at();

ALTER TABLE public.booking_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage booking_inquiries"
  ON public.booking_inquiries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

CREATE POLICY "Service role full access to booking_inquiries"
  ON public.booking_inquiries
  FOR ALL
  USING (auth.role() = 'service_role');
