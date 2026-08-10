-- ============================================================================
-- ANON COLUMN-GRANT LOCKDOWN: models + content_items (Phase A)
-- ============================================================================
-- The anon key is public. Until now, anyone could harvest the FULL models row
-- for the entire approved roster straight from PostgREST — first_name,
-- last_name, email, phone, DOB, zelle_info, admin ratings — because the
-- "viewable by everyone" RLS policy grants row access and the table-level
-- SELECT grant exposes every column. Same story for content_items.media_url,
-- which for legacy exclusive items is a fetchable public-bucket URL (unpaid
-- PPV bypass).
--
-- Fix, copied from the messages precedent (20260711100005): REVOKE table-level
-- SELECT from anon, then GRANT SELECT on an explicit safe column list. RLS
-- still applies on top (grants and policies compose) — this changes WHICH
-- COLUMNS anon can ever see, not which rows.
--
-- Phase A scope: **anon only.** The authenticated role keeps its table-level
-- grant for now — fan-facing self-view (settings, wallet), the Spotlight deck,
-- and every admin browser-client page still read via the authenticated role,
-- and each needs a service-role rewrite before authenticated can be revoked
-- (Phase B, enumerated in the 2026-08-10 audit).
--
-- Ops notes:
-- - Column REVOKE alone is a NO-OP while a table-level grant exists — the
--   table grant must be revoked first, exactly as done here.
-- - Any anon-role query that references an ungranted column (select, filter,
--   or ORDER BY — including select("*") expansion and head-counts) fails with
--   "permission denied". Every logged-out surface was enumerated and rewritten
--   to explicit granted columns or the service client in the same deploy.
-- - Fail-closed: columns added to models later are invisible to anon until
--   explicitly granted here. That is the point.
-- - Column lists were generated from LIVE information_schema (2026-08-10),
--   not src/types/database.ts (stale: missing available_for_calls,
--   link_attested_at, display_name, content_items.like_count).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- models
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.models FROM anon;

-- Safe public subset: profile identity, opt-in location, physical stats the
-- profile renders, booking/collab rates, chat/call rates + reachability,
-- follower COUNTS (social HANDLES are the signup gate — never granted),
-- moderation-neutral flags. Explicitly ungranted: legal names, email, phone,
-- DOB, payout/KYC/banking, coin/gem balances, admin_rating + rating_tier,
-- invite tokens, form_data, comp card internals, IG audience internals,
-- social handles, deleted_reason, exa_doll internals.
GRANT SELECT (
  id,
  user_id,
  username,
  display_name,
  bio,
  profile_photo_url,
  profile_photo_width,
  profile_photo_height,
  city,
  state,
  show_location,
  specialty,
  focus_tags,
  new_face,
  height,
  bust,
  waist,
  hips,
  dress_size,
  shoe_size,
  eye_color,
  hair_color,
  show_measurements,
  show_social_media,
  show_instagram_stats,
  show_links,
  show_additional_info,
  show_booking_rates,
  show_on_rates_page,
  is_approved,
  is_verified,
  is_featured,
  deactivated,
  deleted_at,
  claimed_at,
  created_at,
  updated_at,
  last_active_at,
  reliability_score,
  profile_views,
  instagram_followers,
  tiktok_followers,
  snapchat_followers,
  x_followers,
  youtube_subscribers,
  instagram_engagement_rate,
  avg_instagram_impressions,
  avg_tiktok_views,
  open_to_collabs,
  instagram_collab_rate,
  tiktok_collab_rate,
  instagram_cpm,
  tiktok_cpm,
  photoshoot_hourly_rate,
  photoshoot_half_day_rate,
  photoshoot_full_day_rate,
  promo_hourly_rate,
  brand_ambassador_daily_rate,
  private_event_hourly_rate,
  social_companion_hourly_rate,
  meet_greet_rate,
  travel_fee,
  rate_min,
  rate_max,
  rate_type,
  message_rate,
  video_call_rate,
  voice_call_rate,
  video_is_online,
  available_for_calls,
  allow_chat,
  allow_tips,
  allow_video_call,
  allow_voice_call,
  availability_status,
  affiliate_code,
  points_cached,
  level_cached
) ON public.models TO anon;

-- ---------------------------------------------------------------------------
-- content_items
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.content_items FROM anon;

-- Everything except media_url. Exclusive items' preview_url is the blurred
-- low-res generated at upload; the raw media path/URL must never be readable
-- by the public role (legacy exclusive rows hold PUBLIC portfolio-bucket URLs
-- where URL secrecy is the only protection).
GRANT SELECT (
  id,
  model_id,
  set_id,
  title,
  description,
  media_type,
  preview_url,
  status,
  coin_price,
  publish_at,
  position,
  tags,
  width,
  height,
  is_primary,
  view_count,
  unlock_count,
  like_count,
  legacy_premium_content_id,
  created_at,
  updated_at
) ON public.content_items TO anon;
