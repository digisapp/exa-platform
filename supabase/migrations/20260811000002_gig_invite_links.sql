-- Gig invite links: an unguessable per-gig token the team can text / DM to a
-- model. /gigs/[slug]?invite=<token> shows that one gig to a logged-out
-- visitor (page validates the token and fetches via service role, bypassing
-- the members-only gigs RLS for exactly that gig); the Apply button then
-- routes them into model signup / sign-in. The gigs catalog stays
-- members-only — this shares single gigs deliberately, same trust model as
-- gig_casting_links.

CREATE TABLE public.gig_invite_links (
  gig_id UUID PRIMARY KEY REFERENCES public.gigs(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gig_invite_links ENABLE ROW LEVEL SECURITY;

-- Writes are service-role-only; admin dashboards may read from the browser.
REVOKE ALL ON public.gig_invite_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gig_invite_links FROM authenticated;

CREATE POLICY "Admins can read invite links"
  ON public.gig_invite_links FOR SELECT
  TO authenticated
  USING (public.is_admin());
