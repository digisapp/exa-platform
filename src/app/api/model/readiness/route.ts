import { NextRequest, NextResponse } from "next/server";
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
