import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
] as const;

const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_TYPES),
});

export const POST = withAuth(
  async ({ request }) => {
    // Create admin client for storage operations (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient();

    let raw;
    try {
      raw = await request.json();
    } catch (parseError) {
      logger.error("Workshop upload: JSON parse error", parseError);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = uploadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { contentType } = parsed.data;

    // Generate unique path - derive extension from validated MIME type, not user filename
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov",
    };
    const timestamp = Date.now();
    const ext = MIME_TO_EXT[contentType] || "jpg";
    const path = `workshops/${timestamp}.${ext}`;

    // Create signed upload URL using admin client - store in gigs bucket (already exists)
    const { data, error } = await supabaseAdmin.storage
      .from("gigs")
      .createSignedUploadUrl(path);

    if (error) {
      logger.error("Signed URL error", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    // Get the public URL for after upload
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("gigs")
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
    });
  },
  { requireType: "admin" }
);
