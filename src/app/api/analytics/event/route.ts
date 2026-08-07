import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Same bot filter as /api/analytics/track
const BOT_PATTERNS = /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|openai|ccbot|scrapy|wget|curl|python-requests|go-http-client|java|libwww|lwp|httpclient/i;

// Allowlist so random clients can't fill the table with junk event names.
// Add new funnel events here as they're instrumented.
//
// Model-activation events (north-star funnel, 2026-07-22): rate_set fires
// from the settings rates save. payout_method_added / push_subscribed /
// availability_toggled are forward-provisioned — their emit points ship
// with the payout, push, and call-availability workstreams. Emitters must
// pass opts.modelId to trackEvent or the row loses model attribution
// (only user_id is auto-attached from the session below).
const ALLOWED_EVENTS = new Set([
  "social_gate_click",
  // Logged-out heart click on a /models card opened the personalized
  // follow gate; conversions carry signup_source="follow_gate".
  "follow_gate_click",
  // "Book" CTA opened the booking inquiry dialog (metadata.source:
  // "card" | "profile" | "explore_header"); submissions land in
  // booking_inquiries, so open→submit is the funnel pair.
  "book_inquiry_open",
  "rate_set",
  "payout_method_added",
  "push_subscribed",
  // Push opt-in funnel (2026-07-29): push_nudge_shown fires on dashboard
  // nudge impression (metadata.mode: "push" | "a2hs"); push_denied when the
  // permission prompt is refused. Opt-in rate = push_subscribed (metadata
  // .source: "dashboard_nudge" | "settings") / push_nudge_shown.
  "push_nudge_shown",
  "push_denied",
  "availability_toggled",
  // Emitted server-side by /api/calls/knock (fan tried to call an offline
  // model); listed here so reporting treats it as a known event.
  "call_knock",
  // Model signup funnel (2026-08-03). The application form had no telemetry at
  // all, so a falling submission count was indistinguishable from falling
  // traffic. signup_form_opened fires once per mount (metadata.surface:
  // "dialog" | "apply_page"); signup_validation_error carries metadata.field
  // so we can see which field people die on; signup_submitted fires on a
  // successful POST. Drop-off = opened - submitted.
  "signup_form_opened",
  "signup_validation_error",
  "signup_submitted",
  // Post-signup welcome sheet on model profiles (2026-08-07): shown fires
  // once when the sheet opens after a gate signup (metadata.source carries
  // the originating gate, e.g. "social_gate"); message_sent fires when that
  // same pageview later sends a message, so shown → message_sent is the
  // activation rate of the welcome moment.
  "welcome_prompt_shown",
  "welcome_prompt_message_sent",
]);

export async function POST(request: NextRequest) {
  try {
    const eventSchema = z.object({
      eventName: z.string().min(1).max(64),
      visitorId: z.string().min(1).max(64),
      sessionId: z.string().max(64).nullish(),
      modelId: z.string().uuid().nullish(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { eventName, visitorId, sessionId, modelId, metadata } = parsed.data;

    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    if (BOT_PATTERNS.test(userAgent)) {
      return NextResponse.json({ success: true });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "analytics", visitorId);
    if (rateLimitResponse) {
      return NextResponse.json({ success: true });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceClient = createServiceRoleClient();
    // analytics_events is newer than the generated DB types
    const { error } = await (serviceClient as any).from("analytics_events").insert({
      event_name: eventName,
      model_id: modelId || null,
      visitor_id: visitorId,
      session_id: sessionId || null,
      user_id: user?.id || null,
      metadata: metadata || {},
    });

    if (error) {
      logger.error("Failed to track event", undefined, { message: error.message, code: error.code });
      return NextResponse.json({ error: "Failed to track" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Analytics event error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
