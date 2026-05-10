/**
 * GET /api/verifications/me
 *
 * Returns the current model's verification state — used by /wallet to decide
 * whether to show the cash-out button or the verify-first CTA.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: model } = await supabase
      .from("models")
      .select("id, identity_verified_at, verified_legal_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (model.identity_verified_at) {
      return NextResponse.json({
        status: "verified",
        verifiedAt: model.identity_verified_at,
        legalName: model.verified_legal_name,
      });
    }

    // Find latest verification request (if any).
    const { data: latest } = await (supabase.from("model_verifications") as any)
      .select("id, status, submitted_at, rejection_reason")
      .eq("model_id", model.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      return NextResponse.json({ status: "not_started" });
    }

    return NextResponse.json({
      status: latest.status,
      submittedAt: latest.submitted_at,
      rejectionReason: latest.rejection_reason,
    });
  } catch (error) {
    logger.error("Verification status error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
