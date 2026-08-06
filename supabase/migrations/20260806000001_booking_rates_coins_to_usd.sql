-- Booking rates move from coins to USD.
--
-- The rate columns were created as USD (see 00021 comments) but the Settings
-- UI collected them as coins at a promised "1 coin = $0.10". Real-world
-- bookings are now team-mediated USD leads (booking_inquiries) with a 20%
-- EXA commission, so convert every stored coin value to whole dollars at the
-- rate models were shown when they typed them.
--
-- One-shot data conversion: must run exactly once.

UPDATE public.models SET
  photoshoot_hourly_rate      = round(photoshoot_hourly_rate      * 0.10),
  photoshoot_half_day_rate    = round(photoshoot_half_day_rate    * 0.10),
  photoshoot_full_day_rate    = round(photoshoot_full_day_rate    * 0.10),
  promo_hourly_rate           = round(promo_hourly_rate           * 0.10),
  brand_ambassador_daily_rate = round(brand_ambassador_daily_rate * 0.10),
  private_event_hourly_rate   = round(private_event_hourly_rate   * 0.10),
  social_companion_hourly_rate = round(social_companion_hourly_rate * 0.10),
  meet_greet_rate             = round(meet_greet_rate             * 0.10),
  travel_fee                  = round(travel_fee                  * 0.10)
WHERE coalesce(photoshoot_hourly_rate, 0) > 0
   OR coalesce(photoshoot_half_day_rate, 0) > 0
   OR coalesce(photoshoot_full_day_rate, 0) > 0
   OR coalesce(promo_hourly_rate, 0) > 0
   OR coalesce(brand_ambassador_daily_rate, 0) > 0
   OR coalesce(private_event_hourly_rate, 0) > 0
   OR coalesce(social_companion_hourly_rate, 0) > 0
   OR coalesce(meet_greet_rate, 0) > 0
   OR coalesce(travel_fee, 0) > 0;

COMMENT ON COLUMN public.models.travel_fee IS 'Travel fee for out-of-area bookings in USD';
