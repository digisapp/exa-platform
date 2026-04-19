import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/admin/flyers/overlay
 * Creates a signed upload URL for direct-to-Supabase upload.
 * Body: { contentType: string }
 * Returns: { signedUrl, storagePath, publicUrl }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contentType } = await request.json();

  if (!contentType || !ALLOWED_TYPES[contentType]) {
    return NextResponse.json({ error: "Only PNG, WebP, and GIF files allowed" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const ext = ALLOWED_TYPES[contentType];
  const storagePath = `flyers/overlays/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data: signedData, error: signError } = await admin.storage
    .from("portfolio")
    .createSignedUploadUrl(storagePath);

  if (signError || !signedData) {
    return NextResponse.json({ error: signError?.message || "Failed to create upload URL" }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from("portfolio")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    token: signedData.token,
    storagePath,
    publicUrl,
  });
}
