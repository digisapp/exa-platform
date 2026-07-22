-- Runway Ready "share your link" self-attestation (model-experience overhaul).
--
-- The link_live readiness item is auto-verified by social-referrer page_views;
-- link_attested_at is the in-app fallback: the model taps "I've added my link"
-- and the step completes by attestation, so the meter can reach 100% without
-- waiting on inbound traffic. Real social-referrer traffic supersedes
-- attestation in copy ("verified" vs "marked done").
--
-- Written ONLY via POST /api/model/readiness (service role, auth + Zod +
-- rate limit in the route) — models writes never go through session clients
-- (RLS write-holes lockdown convention).
--
-- NOTE: show_on_rates_page deliberately keeps its DEFAULT false — new
-- approvals opt in explicitly in src/lib/model-approval.ts so existing rows
-- and non-approval insert paths are untouched.
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS link_attested_at timestamptz;

COMMENT ON COLUMN public.models.link_attested_at IS
  'Model self-attested she added her examodels.com link to her socials (Runway Ready link step). Set once via POST /api/model/readiness; superseded in copy by real social-referrer traffic.';
