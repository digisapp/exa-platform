import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * One shared write path for "a model just earned coins" bell notifications.
 *
 * The bell badge is a COUNT of unread rows in public.notifications
 * (/api/notifications/feed), while the popover FEED is reconstructed live
 * from coin_transactions — so every type inserted here MUST have a matching
 * ledger action included in the feed route's money-actions query, or the
 * badge increments with nothing to show (ghost badge). Current pairing:
 *
 *   notification type          ledger action (coin_transactions)
 *   ───────────────────────    ─────────────────────────────────
 *   tip_received               tip_received
 *   live_wall_tip_received     live_wall_tip_received
 *   content_sale               content_sale
 *   ppv_sale                   ppv_sale        (internal name only — user
 *                              copy says "paid photo/video", never "PPV")
 *   auction_sale               auction_sale
 *
 * Rules baked in here:
 * - Service-role client only: an RLS insert policy exists on notifications
 *   and session-client writes for another user silently no-op.
 * - Recipient must be a CLAIMED model (auth user id) — callers pass the
 *   model's user_id and we bail on null so unclaimed import rows are never
 *   touched.
 * - Live schema columns only: user_id / type / title / message / metadata /
 *   action_url. There is no actor_id/body/data (stale inserts using those
 *   are silently dead — do not copy them).
 * - Never throws: a failed notification must never fail the money event.
 *
 * Live-wall exception: tips >= 50 coins already get a notification INSIDE
 * tip_live_wall_message (20260426000002). The live-wall route only calls
 * this helper for amounts < 50 to avoid double-inserting.
 */

export type EarningNotificationType =
  | "tip_received"
  | "live_wall_tip_received"
  | "content_sale"
  | "ppv_sale"
  | "auction_sale";

export async function insertEarningNotification(
  service: SupabaseClient<any>,
  params: {
    /** Recipient MODEL's auth user id (models.user_id). Null → no-op. */
    recipientUserId: string | null | undefined;
    type: EarningNotificationType;
    title: string;
    /** User-visible string — @username only, no real names, no "PPV". */
    message: string;
    amountCoins: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!params.recipientUserId) return;
  try {
    const { error } = await (service.from("notifications") as any).insert({
      user_id: params.recipientUserId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: "/wallet",
      metadata: { amount: params.amountCoins, ...(params.metadata || {}) },
    });
    if (error) {
      logger.error("Failed to insert earning notification", undefined, {
        type: params.type,
        message: error.message,
        code: error.code,
      });
    }
  } catch (err) {
    logger.error("Earning notification error", err, { type: params.type });
  }
}
