import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { notifyCallKnockersModelOnline } from "@/lib/calls/knock-online-notify";
import { z } from "zod";
import { logger } from "@/lib/logger";

const availabilitySchema = z.object({
  available: z.boolean(),
});

// POST - Flip the caller's models.available_for_calls flag.
//
// The SINGLE write path for call availability: both the dashboard pill and
// the settings toggle post here. Auth + validation happen on the session
// client, the write goes through the service role (model-table writes are
// service-role-only by convention — a session write that RLS silently
// filters to zero rows still "succeeds", which is exactly the failure mode
// the RLS write-holes lockdown taught us to avoid).
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
    const parsed = availabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { available } = parsed.data;

    // Only model actors have an availability flag. Prior reachability state
    // is read here too: flipping available on while otherwise unreachable is
    // a knock-serving transition. Newer columns than the generated DB types.
    const { data: model } = await (supabase.from("models") as any)
      .select("id, user_id, video_is_online, available_for_calls")
      .eq("user_id", user.id)
      .single() as {
        data: {
          id: string;
          user_id: string;
          video_is_online: boolean | null;
          available_for_calls: boolean | null;
        } | null;
      };

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    const service = createServiceRoleClient();

    // available_for_calls is newer than the generated DB types
    const { error: updateError } = await (service as any)
      .from("models")
      .update({ available_for_calls: available })
      .eq("id", model.id);

    if (updateError) throw updateError;

    if (available && !model.video_is_online && !model.available_for_calls) {
      // Unreachable → reachable via the manual toggle — ping fans who
      // knocked while this model was away. Awaited so serverless can't kill
      // the send mid-flight; only runs on the actual transition.
      try {
        await notifyCallKnockersModelOnline(service, model.id);
      } catch (err) {
        logger.error("knock online-notify on availability toggle failed", err);
      }
    }

    // availability_toggled is in the /api/analytics/event allowlist; emitted
    // server-side here (service-role insert, same pattern as /api/push/subscribe).
    // models.id === actors.id for model actors, so model_id attribution holds.
    const { error: analyticsError } = await (service as any)
      .from("analytics_events")
      .insert({
        event_name: "availability_toggled",
        model_id: model.id,
        visitor_id: null,
        session_id: null,
        user_id: user.id,
        metadata: { available },
      });
    if (analyticsError) {
      // Non-fatal: never fail the toggle over analytics
      logger.warn("Failed to track availability_toggled", {
        message: analyticsError.message,
      });
    }

    return NextResponse.json({ success: true, available });
  } catch (error) {
    logger.error("Availability toggle error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
