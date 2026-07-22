-- Money events light the bell: new notification_type enum values
-- Migration: 20260722000800_notification_money_types.sql
--
-- The bell badge counts rows in public.notifications, but until now only
-- tips ever wrote a row (live-wall super tips >= 50 coins, inside
-- tip_live_wall_message — 20260426000002). Content sales, paid chat-media
-- unlocks, and auction sales were invisible: notifications.type is a strict
-- Postgres ENUM (notification_type), and inserting an out-of-enum value
-- errors — every app insert path ignores .error, so rows silently never
-- landed and the badge never lit.
--
-- This migration ONLY adds the enum values. App code that inserts them
-- ships separately (src/lib/earning-notifications.ts + the money routes):
-- ALTER TYPE ... ADD VALUE may run inside this migration's transaction on
-- PG 12+, but the new values MUST NOT be referenced in the same
-- transaction — keep this file free of any INSERT/DEFAULT using them.
--
-- Naming: values mirror the coin_transactions.action names for the same
-- events (content_sale / ppv_sale / auction_sale / live_wall_tip_received)
-- so the ledger and the notifications table speak one vocabulary.
-- 'ppv_sale' is internal-only and never surfaces in payloads or copy: the
-- feed API maps it to "media_unlock" and all user-visible strings say
-- "paid photo/video" (no-PPV copy rule). tip_received already exists.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'content_sale';

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ppv_sale';

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'auction_sale';

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'live_wall_tip_received';
