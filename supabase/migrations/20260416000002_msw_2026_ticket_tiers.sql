-- ============================================
-- MSW 2026 · Ticket tier expansion + venue alignment
--
-- Context: Miami Swim Week 2026 is a 7-day takeover of The Alexander Hotel
-- (May 25-31). Monday is a ticketed Casting Call Day Party (11am-4pm) and
-- Tuesday-Sunday are evening runway shows (doors 6pm, show 7pm).
--
-- This migration:
--   1. Extends the event's start_date to Monday May 25 so the Casting Call
--      Day Party falls inside the event window.
--   2. Aligns the venue fields to "The Alexander Hotel, Miami Beach".
--   3. Adds Monday Casting Day Party ticket tiers (GA + two bottle-table sizes).
--   4. For each existing evening show (May 26-31), adds GA Standing, 3rd Row,
--      and VIP Bottle Table tiers (5 guests and 10 guests).
--
-- NOT TOUCHED: existing Day 1-6 First Row ($125) and Second Row ($70) tiers
-- stay exactly as configured. This migration is additive and idempotent.
-- ============================================

-- 1. Update event metadata (venue + extended start date)
UPDATE public.events
SET
  start_date = COALESCE(start_date, '2026-05-25T11:00:00-04:00'::timestamptz),
  location_name = 'The Alexander Hotel',
  location_city = 'Miami Beach',
  location_state = 'FL'
WHERE slug = 'miami-swim-week-2026';

-- Explicitly push start_date back to May 25 even if it was already set
UPDATE public.events
SET start_date = '2026-05-25T11:00:00-04:00'::timestamptz
WHERE slug = 'miami-swim-week-2026'
  AND start_date > '2026-05-25T11:00:00-04:00'::timestamptz;

-- 2. Insert new ticket tiers
DO $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id
  FROM public.events
  WHERE slug = 'miami-swim-week-2026';

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event miami-swim-week-2026 not found — migration aborted';
  END IF;

  -- Make sure tickets are enabled on the event
  UPDATE public.events SET tickets_enabled = true WHERE id = v_event_id;

  -- ==========================================
  -- MONDAY MAY 25 — CASTING CALL DAY PARTY
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Casting Call Day Party — GA (May 25)',
     'casting-day-party-ga-may-25',
     'General admission to the Casting Call Day Party. 11am-4pm at The Alexander Hotel pool deck. Pool, sun, music, and 600+ models casting for Miami Swim Week.',
     3500, 300, 100),

    (v_event_id,
     'Casting Call Day Party — VIP Bottle Table · 5 Guests (May 25)',
     'casting-day-party-bottle-5-may-25',
     'VIP bottle table at the Casting Call Day Party. Seats 5 guests · premium poolside placement · dedicated server · one bottle of choice included. 11am-4pm at The Alexander Hotel.',
     75000, 12, 105),

    (v_event_id,
     'Casting Call Day Party — VIP Bottle Table · 10 Guests (May 25)',
     'casting-day-party-bottle-10-may-25',
     'VIP bottle table at the Casting Call Day Party. Seats 10 guests · premium poolside placement · dedicated server · two bottles of choice included. 11am-4pm at The Alexander Hotel.',
     125000, 8, 106)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 1 — TUESDAY MAY 26 (Opening Show)
  -- Existing: 1st Row ($125), 2nd Row ($70) — untouched
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 1 - GA Standing (May 26)',
     'day-1-ga-standing-may-26',
     'General admission standing for the May 26 Opening Show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 200),

    (v_event_id,
     'Day 1 - Third Row (May 26)',
     'day-1-third-row-may-26',
     'Third row seating for the May 26 Opening Show. Doors 6pm, Show 7pm.',
     5000, 100, 201),

    (v_event_id,
     'Day 1 - VIP Bottle Table · 5 Guests (May 26)',
     'day-1-bottle-5-may-26',
     'VIP bottle table at the May 26 Opening Show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 204),

    (v_event_id,
     'Day 1 - VIP Bottle Table · 10 Guests (May 26)',
     'day-1-bottle-10-may-26',
     'VIP bottle table at the May 26 Opening Show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 205)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 2 — WEDNESDAY MAY 27
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 2 - GA Standing (May 27)',
     'day-2-ga-standing-may-27',
     'General admission standing for the May 27 runway show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 210),

    (v_event_id,
     'Day 2 - Third Row (May 27)',
     'day-2-third-row-may-27',
     'Third row seating for the May 27 runway show. Doors 6pm, Show 7pm.',
     5000, 100, 211),

    (v_event_id,
     'Day 2 - VIP Bottle Table · 5 Guests (May 27)',
     'day-2-bottle-5-may-27',
     'VIP bottle table at the May 27 runway show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 214),

    (v_event_id,
     'Day 2 - VIP Bottle Table · 10 Guests (May 27)',
     'day-2-bottle-10-may-27',
     'VIP bottle table at the May 27 runway show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 215)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 3 — THURSDAY MAY 28 (Sunset Beach Show)
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 3 - GA Standing (May 28)',
     'day-3-ga-standing-may-28',
     'General admission standing for the May 28 Sunset Beach Show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 220),

    (v_event_id,
     'Day 3 - Third Row (May 28)',
     'day-3-third-row-may-28',
     'Third row seating for the May 28 Sunset Beach Show. Doors 6pm, Show 7pm.',
     5000, 100, 221),

    (v_event_id,
     'Day 3 - VIP Bottle Table · 5 Guests (May 28)',
     'day-3-bottle-5-may-28',
     'VIP bottle table at the May 28 Sunset Beach Show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 224),

    (v_event_id,
     'Day 3 - VIP Bottle Table · 10 Guests (May 28)',
     'day-3-bottle-10-may-28',
     'VIP bottle table at the May 28 Sunset Beach Show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 225)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 4 — FRIDAY MAY 29
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 4 - GA Standing (May 29)',
     'day-4-ga-standing-may-29',
     'General admission standing for the May 29 runway show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 230),

    (v_event_id,
     'Day 4 - Third Row (May 29)',
     'day-4-third-row-may-29',
     'Third row seating for the May 29 runway show. Doors 6pm, Show 7pm.',
     5000, 100, 231),

    (v_event_id,
     'Day 4 - VIP Bottle Table · 5 Guests (May 29)',
     'day-4-bottle-5-may-29',
     'VIP bottle table at the May 29 runway show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 234),

    (v_event_id,
     'Day 4 - VIP Bottle Table · 10 Guests (May 29)',
     'day-4-bottle-10-may-29',
     'VIP bottle table at the May 29 runway show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 235)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 5 — SATURDAY MAY 30
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 5 - GA Standing (May 30)',
     'day-5-ga-standing-may-30',
     'General admission standing for the May 30 runway show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 240),

    (v_event_id,
     'Day 5 - Third Row (May 30)',
     'day-5-third-row-may-30',
     'Third row seating for the May 30 runway show. Doors 6pm, Show 7pm.',
     5000, 100, 241),

    (v_event_id,
     'Day 5 - VIP Bottle Table · 5 Guests (May 30)',
     'day-5-bottle-5-may-30',
     'VIP bottle table at the May 30 runway show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 244),

    (v_event_id,
     'Day 5 - VIP Bottle Table · 10 Guests (May 30)',
     'day-5-bottle-10-may-30',
     'VIP bottle table at the May 30 runway show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 245)
  ON CONFLICT (event_id, slug) DO NOTHING;

  -- ==========================================
  -- DAY 6 — SUNDAY MAY 31 (Pool Vibes Closing Show)
  -- ==========================================
  INSERT INTO public.ticket_tiers
    (event_id, name, slug, description, price_cents, quantity_available, sort_order)
  VALUES
    (v_event_id,
     'Day 6 - GA Standing (May 31)',
     'day-6-ga-standing-may-31',
     'General admission standing for the May 31 Pool Vibes Closing Show. Doors 6pm, Show 7pm. Global designers + 100+ models on the runway.',
     3500, 200, 250),

    (v_event_id,
     'Day 6 - Third Row (May 31)',
     'day-6-third-row-may-31',
     'Third row seating for the May 31 Pool Vibes Closing Show. Doors 6pm, Show 7pm.',
     5000, 100, 251),

    (v_event_id,
     'Day 6 - VIP Bottle Table · 5 Guests (May 31)',
     'day-6-bottle-5-may-31',
     'VIP bottle table at the May 31 Pool Vibes Closing Show. Seats 5 guests · 1st row runway placement included · dedicated server · one bottle of choice. Doors 6pm.',
     200000, 10, 254),

    (v_event_id,
     'Day 6 - VIP Bottle Table · 10 Guests (May 31)',
     'day-6-bottle-10-may-31',
     'VIP bottle table at the May 31 Pool Vibes Closing Show. Seats 10 guests · 1st row runway placement included · dedicated server · two bottles of choice. Doors 6pm.',
     350000, 6, 255)
  ON CONFLICT (event_id, slug) DO NOTHING;

END $$;
