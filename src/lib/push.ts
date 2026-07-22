// Web Push utility using VAPID (web-push)
// Set these environment variables:
// VAPID_PUBLIC_KEY
// VAPID_PRIVATE_KEY
// VAPID_SUBJECT (optional, defaults to mailto:hello@examodels.com)
// NEXT_PUBLIC_VAPID_PUBLIC_KEY (same value as VAPID_PUBLIC_KEY — the browser
//   subscribe call reads it; not used here)
//
// Degrades to a logged no-op when keys are absent, exactly like lib/sms.ts
// degrades without Twilio credentials. web-push uses Node crypto — every
// route that imports this module must stay on the Node runtime (never add
// `export const runtime = "edge"`).

import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { DEFAULT_PUSH_PREFERENCES, type PushEventKey } from "@/lib/push-config";

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path the SW notificationclick handler opens/focuses, e.g. "/dashboard/messages" */
  url?: string;
  /** Notifications with the same tag replace each other instead of stacking */
  tag?: string;
}

export interface PushSendResult {
  success: boolean;
  /** Notifications accepted by a push service */
  sent: number;
  /** Dead subscriptions (404/410 Gone) deleted inline */
  pruned: number;
  error?: string;
}

let vapidInitialized = false;

function initVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return false;
  }

  if (!vapidInitialized) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:hello@examodels.com",
      publicKey,
      privateKey
    );
    vapidInitialized = true;
  }

  return true;
}

/**
 * Send a web push notification to every subscribed device of an actor.
 *
 * - actorId is always actors.id (same id the money ledger uses).
 * - eventKey is checked against push_preferences first; a missing row means
 *   enabled (default-on), so only an explicit false suppresses the send.
 * - Best-effort channel: never throws — callers can fire-and-forget.
 */
export async function sendPushToActor(
  actorId: string,
  payload: PushPayload,
  eventKey: PushEventKey
): Promise<PushSendResult> {
  if (!initVapid()) {
    logger.warn("VAPID keys not configured - push not sent");
    return { success: false, sent: 0, pruned: 0, error: "Push not configured" };
  }

  try {
    const service = createServiceRoleClient();

    // Preference gate — no row means everything enabled.
    // push_preferences/push_subscriptions are newer than the generated DB types
    const { data: prefs } = await (service as any)
      .from("push_preferences")
      .select(eventKey)
      .eq("actor_id", actorId)
      .maybeSingle();

    const enabled = prefs
      ? prefs[eventKey] !== false
      : DEFAULT_PUSH_PREFERENCES[eventKey];
    if (!enabled) {
      return { success: true, sent: 0, pruned: 0 };
    }

    const { data: subscriptions } = await (service as any)
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("actor_id", actorId);

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, pruned: 0 };
    }

    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
      )
    );

    let sent = 0;
    const liveEndpoints: string[] = [];
    const deadEndpoints: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        sent++;
        liveEndpoints.push(subscriptions[i].endpoint);
        return;
      }
      const statusCode = (result.reason as { statusCode?: number } | null)?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or was revoked — prune it
        deadEndpoints.push(subscriptions[i].endpoint);
      } else {
        logger.warn("Push send failed", {
          actorId,
          statusCode,
          error: String(result.reason),
        });
      }
    });

    if (deadEndpoints.length > 0) {
      await (service as any)
        .from("push_subscriptions")
        .delete()
        .in("endpoint", deadEndpoints);
    }

    if (liveEndpoints.length > 0) {
      await (service as any)
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("endpoint", liveEndpoints);
    }

    return { success: true, sent, pruned: deadEndpoints.length };
  } catch (error) {
    // Best-effort channel: never let push break the calling route
    logger.error("Push send error", error);
    return { success: false, sent: 0, pruned: 0, error: "Failed to send push" };
  }
}
