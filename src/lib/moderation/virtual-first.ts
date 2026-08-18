import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { detectInPersonRequest } from "@/lib/in-person-request";
import { logger } from "@/lib/logger";

// Virtual-first policy: fans/brands may not ask to meet in person or move a
// conversation off-platform. Matching text is rejected before anything is
// written, every blocked attempt is logged to analytics_events, and a fan who
// racks up this many blocked attempts in the window is flagged for trust &
// safety review (fans.flagged_for_review).
const ACCOUNT_FLAG_THRESHOLD = 3;
const ACCOUNT_FLAG_WINDOW_DAYS = 7;

// Emitted here (server, API-level blocks) AND from the composer via
// trackEvent in MessageInput — the compose dialog stops most attempts before
// they ever reach the API, and those must still hit the audit trail and the
// repeat-offender count below. In the /api/analytics/event allowlist.
export const IN_PERSON_BLOCKED_EVENT = "message_blocked_in_person";

/**
 * Rejects fan/brand message text that requests an in-person meetup or
 * off-platform contact. Returns the 422 response to send back, or null when
 * the message is allowed. Models and admins always pass.
 */
export async function assertVirtualFirst(params: {
  /** Auth user id — analytics attribution and the fans-table flag key. */
  userId: string;
  sender: { id: string; type: string };
  content: string | null | undefined;
  /** Which write path the attempt came through, for auditing. */
  context: "send" | "new_conversation" | "edit";
}): Promise<NextResponse | null> {
  const { userId, sender, content, context } = params;
  if (sender.type !== "fan" && sender.type !== "brand") return null;
  if (!content) return null;

  const detection = detectInPersonRequest(content);
  if (!detection.matched) return null;

  const adminClient = createServiceRoleClient();

  // Bookkeeping must never turn an intentional block into a 500 — the
  // rejection goes out regardless of what happens in here.
  try {
    // analytics_events is newer than the generated DB types (call_knock cast).
    const { error: eventError } = await (adminClient as any)
      .from("analytics_events")
      .insert({
        event_name: IN_PERSON_BLOCKED_EVENT,
        model_id: null,
        visitor_id: null,
        session_id: null,
        user_id: userId,
        metadata: {
          context,
          sender_type: sender.type,
          phrase: detection.phrase,
          content: content.slice(0, 300),
        },
      });
    if (eventError) {
      logger.warn("Failed to log blocked in-person request", {
        message: eventError.message,
      });
    }

    // Repeat-offender escalation — only fans have an account flag column.
    if (sender.type === "fan") {
      const windowStart = new Date(
        Date.now() - ACCOUNT_FLAG_WINDOW_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count } = await (adminClient as any)
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", IN_PERSON_BLOCKED_EVENT)
        .eq("user_id", userId)
        .gte("created_at", windowStart);

      if ((count ?? 0) >= ACCOUNT_FLAG_THRESHOLD) {
        const { error: fanFlagError } = await adminClient
          .from("fans")
          .update({
            flagged_for_review: true,
            flagged_for_review_at: new Date().toISOString(),
            flagged_for_review_reason: "repeated_in_person_requests",
          })
          .eq("user_id", userId)
          .eq("flagged_for_review", false);
        if (fanFlagError) {
          logger.error("Failed to flag fan account for review", fanFlagError);
        }
      }
    }
  } catch (moderationErr) {
    logger.error("Virtual-first moderation error", moderationErr);
  }

  return NextResponse.json(
    {
      error:
        "Asking to meet in person or share contact info isn't allowed on EXA. Please edit your message.",
      code: "IN_PERSON_BLOCKED",
    },
    { status: 422 }
  );
}
