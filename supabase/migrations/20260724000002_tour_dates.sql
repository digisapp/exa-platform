-- Tour Dates: live tour schedule.
-- Tour stops are gigs with type='tour' (same reuse pattern as EXA Travel), so
-- model applications flow through gig_applications unchanged. Designers and
-- media (photographers / videographers / press & PR) apply WITHOUT accounts via
-- a public form that lands here; media applicants are also mirrored into the
-- standing media_contacts roster for mass outreach.

-- 1. Allow 'tour' as a gig type (constraint keeps its legacy opportunities_ name)
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS opportunities_type_check;
ALTER TABLE public.gigs
  ADD CONSTRAINT opportunities_type_check
    CHECK (type = ANY (ARRAY[
      'show'::text, 'photoshoot'::text, 'travel'::text, 'campaign'::text,
      'content'::text, 'hosting'::text, 'fun'::text, 'tour'::text, 'other'::text
    ]));

-- 2. Designer / media applications for tour stops (lead-style rows, no account)
CREATE TABLE public.tour_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('designer', 'media')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,               -- brand name (designer) or outlet/company (media)
  instagram_handle TEXT,
  website_url TEXT,
  media_type TEXT CHECK (media_type IN ('photographer', 'videographer', 'press_pr', 'other')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gig_id, role, email)
);

CREATE INDEX idx_tour_applications_gig ON public.tour_applications (gig_id);
CREATE INDEX idx_tour_applications_role_status ON public.tour_applications (role, status);
CREATE INDEX idx_tour_applications_created_at ON public.tour_applications (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_tour_applications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tour_applications_updated_at
  BEFORE UPDATE ON public.tour_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_tour_applications_updated_at();

-- RLS: admins manage in the dashboard; public form writes go through the
-- service role only (same convention as media_contacts).
ALTER TABLE public.tour_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tour_applications"
  ON public.tour_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

CREATE POLICY "Service role full access to tour_applications"
  ON public.tour_applications
  FOR ALL
  USING (auth.role() = 'service_role');
