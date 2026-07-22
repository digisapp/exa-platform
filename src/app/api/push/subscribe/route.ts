import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Browser PushSubscription.toJSON() shape; unknown keys (expirationTime) are
// stripped by Zod. Push endpoints are long opaque HTTPS URLs.
const subscribeSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});

// POST - Register (or refresh) this browser's push subscription for the
// caller's actor. push_subscriptions writes are service-role-only (RLS):
// auth + validation are enforced here, so this route is the single write path.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { endpoint, keys } = parsed.data;

    // Actor resolved server-side — never trust a client-sent actor_id
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    const service = createServiceRoleClient();

    // Same endpoint can already exist (subscription refresh, or the browser
    // profile switched accounts) — upsert reassigns it to the current actor.
    // Track newness so the analytics event fires once per endpoint, not on
    // every refresh. push_subscriptions is newer than the generated DB types.
    const { data: existing } = await (service as any)
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    const { error: upsertError } = await (service as any)
      .from("push_subscriptions")
      .upsert(
        {
          actor_id: actor.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: request.headers.get("user-agent")?.slice(0, 512) || null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (upsertError) throw upsertError;

    if (!existing) {
      // push_subscribed is in the /api/analytics/event allowlist; emitted
      // server-side here (service-role insert, same pattern as that route).
      // modelId attribution: models.id === actors.id for model actors.
      const { error: analyticsError } = await (service as any)
        .from("analytics_events")
        .insert({
          event_name: "push_subscribed",
          model_id: actor.type === "model" ? actor.id : null,
          visitor_id: null,
          session_id: null,
          user_id: user.id,
          metadata: {},
        });
      if (analyticsError) {
        // Non-fatal: never fail the subscription over analytics
        logger.warn("Failed to track push_subscribed", {
          message: analyticsError.message,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Push subscribe error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
