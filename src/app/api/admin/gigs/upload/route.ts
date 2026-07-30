import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const POST = withAuth(
  async ({ request }) => {
    // Create admin client for storage operations (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Gig upload: JSON parse error:", parseError);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Generate unique path - derive extension from validated MIME type, not user filename
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov",
    };
    const timestamp = Date.now();
    const ext = MIME_TO_EXT[contentType] || "jpg";
    const path = `${timestamp}.${ext}`;

    // Create signed upload URL using admin client
    const { data, error } = await supabaseAdmin.storage
      .from("gigs")
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Signed URL error:", error);
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
