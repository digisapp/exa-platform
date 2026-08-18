-- ============================================================================
-- PHASE B2b: models PII locked away from the authenticated role
-- ============================================================================
-- Phase A (20260810000001) closed the anon-key harvest of models PII. But fan
-- signup is self-serve, so the authenticated role is effectively public: any
-- logged-in account could still read first_name/last_name, email, phone, DOB,
-- payout/KYC fields, balances, and admin ratings for the entire roster
-- straight from PostgREST. This flips the authenticated grant to an explicit
-- safe column list.
--
-- Prerequisite (Phase B2a, PR #248, deployed first): every browser/cookie-
-- client models read referencing a revoked column was moved to the service
-- role or a withAuth API route. scripts/check-models-column-grants.mjs is the
-- static gate and runs clean on the deployed tree.
--
-- authenticated = the anon set (78 columns) + signup-gated social handles.
-- Handles stay revoked from anon (they gate signup) but logged-in users see
-- them across the product.
--
-- Phase A lesson applied: table-level REVOKE does not remove stray
-- COLUMN-level grants, so the highest-risk columns are also revoked
-- explicitly per column. After applying, verify residual grants with
-- information_schema.role_column_grants (count DISTINCT column_name).
--
-- Rollback if anything breaks: GRANT SELECT ON public.models TO authenticated
-- restores the old behavior instantly (RLS is untouched throughout).
-- ============================================================================

REVOKE SELECT ON public.models FROM authenticated;

-- Belt-and-braces explicit column revokes for the most sensitive fields
-- (survives any stray direct grants that predate migration discipline).
REVOKE SELECT (
  first_name, last_name, email, phone, dob, date_of_birth,
  zelle_info, preferred_payout_method, withheld_balance, coin_balance,
  gem_balance, admin_rating, rating_tier, invite_token, invite_sent_at,
  form_data, verified_legal_name, verified_dob, verified_country,
  identity_verified_at, identity_verified_by
) ON public.models FROM authenticated;

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
  level_cached,
  instagram_name,
  tiktok_username,
  snapchat_username,
  x_username,
  youtube_username,
  twitch_username
) ON public.models TO authenticated;
