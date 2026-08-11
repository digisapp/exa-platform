-- Movie / Music Video gig types + public client casting links.
--
-- 1. 'movie' and 'music_video' join the gig type check (constraint keeps its
--    legacy opportunities_ name).
-- 2. Client casting links: a gig can get an unguessable share token; the
--    public /casting/[token] page lists applicants (photo + username only —
--    never real names) so an outside client can heart the models they want.
--    Tokens and hearts are written by the service role only; admin dashboards
--    read them from the browser client via explicit is_admin() SELECT
--    policies (same convention as analytics stats).

ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS opportunities_type_check;
ALTER TABLE public.gigs
  ADD CONSTRAINT opportunities_type_check
    CHECK (type = ANY (ARRAY[
      'show'::text, 'photoshoot'::text, 'travel'::text, 'campaign'::text,
      'content'::text, 'hosting'::text, 'fun'::text, 'tour'::text,
      'movie'::text, 'music_video'::text, 'other'::text
    ]));

CREATE TABLE public.gig_casting_links (
  gig_id UUID PRIMARY KEY REFERENCES public.gigs(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presence of a row = the client hearted this applicant.
CREATE TABLE public.gig_casting_hearts (
  application_id UUID PRIMARY KEY REFERENCES public.gig_applications(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gig_casting_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_casting_hearts ENABLE ROW LEVEL SECURITY;

-- Writes are service-role-only; the anon client must never see tokens (a
-- leaked token exposes the applicant list) or hearts.
REVOKE ALL ON public.gig_casting_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gig_casting_links FROM authenticated;
REVOKE ALL ON public.gig_casting_hearts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gig_casting_hearts FROM authenticated;

CREATE POLICY "Admins can read casting links"
  ON public.gig_casting_links FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can read casting hearts"
  ON public.gig_casting_hearts FOR SELECT
  TO authenticated
  USING (public.is_admin());
