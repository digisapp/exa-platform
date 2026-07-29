-- Bio-link attribution: mark profile views that were the ENTRY POINT of a
-- visit (first page of the document load, arriving from outside EXA). These
-- landings are the best available proxy for "someone tapped this model's
-- shared link" — in-app browsers (Instagram/TikTok) strip the referrer, so
-- the referrer column alone can't see bio-link traffic.
--
-- Written by /api/models/[id]/view from a client-computed flag; data starts
-- 2026-07-29 (rows before then are all false). Consumed by the admin
-- leaderboards rollup only — never exposed to models (owner decision:
-- models see aggregate traffic, never conversion data).

alter table public.profile_views
  add column if not exists is_landing boolean not null default false;

-- Rollup counts landings per model; partial index keeps it cheap.
create index if not exists idx_profile_views_landing_model
  on public.profile_views (model_id)
  where is_landing;
