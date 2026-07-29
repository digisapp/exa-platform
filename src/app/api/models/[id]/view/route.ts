import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const { id: modelId } = await context.params;

    if (!modelId) {
      return NextResponse.json({ error: "Model ID required" }, { status: 400 });
    }

    // Client-computed entry-point flag (see lib/signup-referrer.ts); body is
    // optional so older cached clients that POST without one keep working.
    let isLanding = false;
    try {
      const body = await request.json();
      isLanding = body?.landing === true;
    } catch {
      // no/invalid body — not a landing
    }

    const supabase = await createClient();

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Get model to check ownership
    const { data: model } = await supabase
      .from("models")
      .select("id, user_id, is_approved, profile_views")
      .eq("id", modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Don't count views from the model themselves
    if (user && model.user_id === user.id) {
      return NextResponse.json({ success: true, counted: false, reason: "owner" });
    }

    // Only count views for approved models
    if (!model.is_approved) {
      return NextResponse.json({ success: true, counted: false, reason: "not_approved" });
    }

    // Increment profile views (service role: visitors have no UPDATE policy on
    // models) and log a profile_views row — the dashboard's 30-day views stat
    // counts that table, which sat empty because only the counter was bumped.
    // The table dedupes to one row per viewer per day via partial unique
    // indexes: (model_id, viewer_id, view_date) for logged-in viewers and
    // (model_id, ip_address, view_date) for anon, so anon rows need the IP.
    // Row insert is best-effort; the lifetime counter stays source of truth.
    const serviceClient = createServiceRoleClient();
    const anonIp = user
      ? null
      : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const [{ error }, { error: logError }] = await Promise.all([
      serviceClient
        .from("models")
        .update({ profile_views: (model.profile_views || 0) + 1 })
        .eq("id", modelId),
      (serviceClient.from("profile_views") as any).insert({
        model_id: modelId,
        viewer_id: user?.id ?? null,
        ip_address: anonIp,
        referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
        user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        is_landing: isLanding,
      }),
    ]);

    if (error) {
      logger.error("Failed to increment views", error);
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
    }
    // 23505 = same viewer already logged today (the dedup indexes working)
    if (logError && logError.code !== "23505") {
      logger.error("Failed to log profile view row", logError);
    }

    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    logger.error("View tracking error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
