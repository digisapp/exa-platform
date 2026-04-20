-- Rename event to "EXA's Miami Swim Week 2026" to distinguish from other
-- Miami Swim Week productions. Also ensure venue is The Alexander Hotel.
UPDATE public.events
SET
  name = 'EXA''s Miami Swim Week 2026',
  location_name = 'The Alexander Hotel',
  location_city = 'Miami Beach',
  location_state = 'FL'
WHERE slug = 'miami-swim-week-2026';
