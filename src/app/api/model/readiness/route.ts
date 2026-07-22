import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { computeCastingReadiness, READINESS_MODEL_COLUMNS } from "@/lib/casting-readiness";

// GET - Casting readiness ("Runway Ready") for the signed-in model.
// page_views and fans have no model-facing read RLS, so the computation
// runs server-side with the service role client — own model only.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const service = createServiceRoleClient();

    const { data: model } = await (service.from("models") as any)
      .select(`username, ${READINESS_MODEL_COLUMNS}`)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const readiness = await computeCastingReadiness(service, model.id, model);

    return NextResponse.json({
      ...readiness,
      profileUrl: model.username ? `https://examodels.com/${model.username}` : null,
    });
  } catch (error) {
    logger.error("[Model Readiness] Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const attestSchema = z.object({
  action: z.literal("link_attested"),
});

// POST - Runway Ready self-attest actions. Currently only "link_attested":
// stamps models.link_attested_at so the "Your link is live" step completes
// in-app before social-referrer traffic verifies it (verified traffic
// supersedes attestation in copy). models writes are service-role-only —
// this route is the single write path for the column; the timestamp is set
// once and never refreshed so the original attest time survives re-clicks.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = attestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const service = createServiceRoleClient();

    // Own model only — resolved from the session, never from the client body.
    const { data: model } = await (service.from("models") as any)
      .select("id, link_attested_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (!model.link_attested_at) {
      const { error: updateError } = await (service.from("models") as any)
        .update({ link_attested_at: new Date().toISOString() })
        .eq("id", model.id);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Model Readiness] Attest error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
