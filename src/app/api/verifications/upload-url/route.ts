/**
 * POST /api/verifications/upload-url
 *
 * Issues a Supabase storage signed upload URL so the model can upload their
 * ID document or selfie directly to the private `identity-documents` bucket.
 * Path is namespaced under the model's ID so RLS prevents cross-model access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const MIME_TO_EXT: Record<(typeof ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

const uploadSchema = z.object({
  kind: z.enum(["id_document", "selfie"]),
  contentType: z.enum(ALLOWED_TYPES),
  verificationDraftId: z.string().uuid(),
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

    const parsed = uploadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { kind, contentType, verificationDraftId } = parsed.data;

    // Find the model owned by this user.
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

    const ext = MIME_TO_EXT[contentType];
    const path = `${model.id}/${verificationDraftId}/${kind}.${ext}`;

    // Service role for storage (bucket is private; the storage RLS policy
    // also permits the model to upload to their own folder, but using the
    // admin client here avoids token-shape edge cases with signed uploads).
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage
      .from("identity-documents")
      .createSignedUploadUrl(path);

    if (error) {
      logger.error("Identity upload-url error", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
    });
  } catch (error) {
    logger.error("Identity upload-url error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
