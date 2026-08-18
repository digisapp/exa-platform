import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/model/profile — the logged-in model's own full row.
 *
 * Settings and the comp-card builder previously did a browser-side
 * select("*") on models. Client roles can no longer read PII columns
 * (Phase B2 column grants), so the self-view read moves here: authenticate,
 * then fetch the caller's own row with the service role. Self-view only —
 * a model reading her own first_name/email/payout fields is the sanctioned
 * exception to the names-are-admin-only rule.
 */
export async function GET(request: NextRequest) {
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

    const { data: model } = await (createServiceRoleClient() as any)
      .from("models")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    return NextResponse.json({ model });
  } catch (error) {
    logger.error("Model profile fetch error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
