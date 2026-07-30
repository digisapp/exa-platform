import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Trip cover uploads go direct-to-storage via a signed URL (same pattern as
// workshops/upload — Vercel's 4.5MB body cap rules out proxying the file).
// Images only; stored in the public `gigs` bucket under travel-covers/.

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_TYPES),
});

export const POST = withAuth(
  async ({ request }) => {
    let raw;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = uploadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = MIME_TO_EXT[parsed.data.contentType] || "jpg";
    const path = `travel-covers/${Date.now()}.${ext}`;

    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin.storage
      .from("gigs")
      .createSignedUploadUrl(path);
    if (error) {
      logger.error("Trip cover signed URL error", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("gigs").getPublicUrl(path);

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
  },
  { requireType: "admin" }
);
