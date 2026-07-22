import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
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

    // Only model actors have an availability flag
    const { data: model } = await supabase
      .from("models")
      .select("id, user_id")
      .eq("user_id", user.id)
      .single() as { data: { id: string; user_id: string } | null };

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
