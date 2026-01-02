-- Add booking rate columns to models table
-- These are USD amounts for in-person services

ALTER TABLE public.models ADD COLUMN IF NOT EXISTS photoshoot_hourly_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS photoshoot_half_day_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS photoshoot_full_day_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS promo_hourly_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS private_event_hourly_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS social_companion_hourly_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS brand_ambassador_daily_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS meet_greet_rate integer DEFAULT 0;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS travel_fee integer DEFAULT 0;

-- Boolean to show/hide booking rates on profile
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS show_booking_rates boolean DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN public.models.photoshoot_hourly_rate IS 'Hourly rate for photoshoots in USD';
COMMENT ON COLUMN public.models.photoshoot_half_day_rate IS 'Half-day (4hr) rate for photoshoots in USD';
COMMENT ON COLUMN public.models.photoshoot_full_day_rate IS 'Full-day (8hr) rate for photoshoots in USD';
COMMENT ON COLUMN public.models.promo_hourly_rate IS 'Hourly rate for promotional modeling in USD';
COMMENT ON COLUMN public.models.private_event_hourly_rate IS 'Hourly rate for private events in USD';
COMMENT ON COLUMN public.models.social_companion_hourly_rate IS 'Hourly rate for social companion services in USD';
COMMENT ON COLUMN public.models.brand_ambassador_daily_rate IS 'Daily rate for brand ambassador work in USD';
COMMENT ON COLUMN public.models.meet_greet_rate IS 'Flat fee for meet and greet appearances in USD';
COMMENT ON COLUMN public.models.travel_fee IS 'Travel fee for out-of-area bookings in USD';
COMMENT ON COLUMN public.models.show_booking_rates IS 'Whether to display booking rates on public profile';
