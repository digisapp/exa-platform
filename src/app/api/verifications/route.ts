/**
 * Identity verification submit + status endpoints.
 *
 * POST /api/verifications  — model submits a new verification request
 *   Body: { id_document_path, selfie_path } (both returned from /upload-url)
 *
 * GET /api/verifications/me — current model's most recent verification record
 *   (used by the wallet UI to gate the cash-out flow).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Path shape: <model_uuid>/<draft_uuid>/<id_document|selfie>.<ext>
// Pinning the format defends against path traversal (..), absolute paths,
// and crafted paths pointing at other models' folders.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_REGEX = new RegExp(
  `^${UUID}\\/${UUID}\\/(id_document|selfie)\\.(jpg|png|webp|heic|pdf)$`
);

const submitSchema = z.object({
  id_document_path: z.string().regex(PATH_REGEX, "invalid path"),
  selfie_path: z.string().regex(PATH_REGEX, "invalid path"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { id_document_path, selfie_path } = parsed.data;

    const { data: model } = await supabase
      .from("models")
      .select("id, identity_verified_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (model.identity_verified_at) {
      return NextResponse.json(
        { error: "Identity is already verified" },
        { status: 400 }
      );
    }

    // Both uploaded paths must be under this model's folder. Defends against
    // a model trying to "submit" using a path they don't actually own.
    const ownsPath = (p: string) => p.startsWith(`${model.id}/`);
    if (!ownsPath(id_document_path) || !ownsPath(selfie_path)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    // Reject if there's already a pending submission — model should wait for
    // admin review or admin should reject the previous one first.
    const admin = createServiceRoleClient();
    const { data: existing } = await (admin as any)
      .from("model_verifications")
      .select("id")
      .eq("model_id", model.id)
      .eq("status", "pending_review")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a verification under review" },
        { status: 409 }
      );
    }

    const { data: created, error: insertError } = await (admin as any)
      .from("model_verifications")
      .insert({
        model_id: model.id,
        status: "pending_review",
        id_document_path,
        selfie_path,
      })
      .select("id, submitted_at, status")
      .single();

    if (insertError) {
      logger.error("Verification insert failed", insertError);
      return NextResponse.json({ error: "Failed to submit verification" }, { status: 500 });
    }

    return NextResponse.json({ success: true, verification: created });
  } catch (error) {
    logger.error("Verification submit error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
