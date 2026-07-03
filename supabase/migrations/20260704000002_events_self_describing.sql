-- Make events self-describing (Phase 1 of generalizing the hardcoded
-- Miami Swim Week logic into a reusable, data-driven event template).
--
-- The public show landing page (/shows/[slug]) special-cased behavior with
-- `slug === 'miami-swim-week-2026'` checks scattered through the code. This
-- adds capability columns so any event can opt into the same behavior as
-- data, not code — a future event (MSW 2027, another show) becomes a row,
-- not a code change.
--
-- Columns are NULLABLE on purpose: the page code falls back to the old MSW
-- slug check when a column is null, so the code refactor and this backfill
-- can ship independently without changing MSW's rendering.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS use_external_ticketing boolean,  -- tickets live on an external provider (e.g. Digis), not EXA's internal flow
  ADD COLUMN IF NOT EXISTS has_casting_call boolean,        -- show a "Model Casting Call — Apply Now" CTA linking to the event's gig
  ADD COLUMN IF NOT EXISTS has_sponsor_pages boolean,       -- show the Designers / Sponsors sign-up links
  ADD COLUMN IF NOT EXISTS has_venue_map boolean,           -- render the venue floor-plan section
  ADD COLUMN IF NOT EXISTS countdown_at timestamptz,        -- countdown target (e.g. opening night), overrides start_date
  ADD COLUMN IF NOT EXISTS schedule jsonb;                  -- multi-show schedule for the landing page (array of entries)

COMMENT ON COLUMN public.events.schedule IS
  'Array of show entries for the landing-page schedule: {id, day, dayShort, date, dateNum, title, description, highlight, badge, digisEventId}.';

-- Backfill MSW 2026 so its page renders identically once the code reads columns.
UPDATE public.events
SET
  use_external_ticketing = true,
  has_casting_call = true,
  has_sponsor_pages = true,
  has_venue_map = true,
  countdown_at = TIMESTAMPTZ '2026-05-26 17:00:00-04',
  ticket_url = 'https://www.digis.cc/events',
  schedule = '[
    {"id":"mon-25-casting","day":"Monday","dayShort":"Mon","date":"May 25","dateNum":"25","title":"Casting Call Day Party","description":"11am–2pm · Pool, sun, and music as 600+ models cast for the EXA Shows.","highlight":true,"badge":null,"digisEventId":"527a6def-8fea-41c3-8d83-2c0d63edcee2"},
    {"id":"tue-26-opening","day":"Tuesday","dayShort":"Tue","date":"May 26","dateNum":"26","title":"Opening Show","description":"Doors 6pm · Show 7pm","highlight":true,"badge":null,"digisEventId":"34393c83-ca92-42f2-9d3e-bfb8988c7807"},
    {"id":"wed-27-day2","day":"Wednesday","dayShort":"Wed","date":"May 27","dateNum":"27","title":"Day 2 Fashion Runway Show","description":"Doors 6pm · Show 7pm","highlight":false,"badge":null,"digisEventId":"2c080487-6a87-4081-bf33-62a8bbfc35fb"},
    {"id":"fri-29-runway","day":"Friday","dayShort":"Fri","date":"May 29","dateNum":"29","title":"Friday Fashion Runway Show","description":"Doors 6pm · Show 7pm","highlight":false,"badge":null,"digisEventId":"1f6425d8-1610-448a-8b89-4c6f514d4dbf"},
    {"id":"sat-30-runway","day":"Saturday","dayShort":"Sat","date":"May 30","dateNum":"30","title":"Saturday Runway Show","description":"Doors 3pm · Show 4pm","highlight":true,"badge":null,"digisEventId":"1d92c752-1827-4de5-9a7d-750ef666ce15"},
    {"id":"sun-31-closing","day":"Sunday","dayShort":"Sun","date":"May 31","dateNum":"31","title":"Sunday Closing","description":"Details coming soon.","highlight":false,"badge":null,"digisEventId":"c598bd96-efe9-4f0a-af38-5cd602f8094b"}
  ]'::jsonb
WHERE slug = 'miami-swim-week-2026';
