import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Only models can upload premium content" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM" },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? "500MB" : "50MB";
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxLabel}` },
        { status: 400 }
      );
    }

    // Generate unique filename - derive extension from validated MIME type, not user filename
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
    };
    const ext = MIME_TO_EXT[file.type] || (isImage ? "jpg" : "mp4");
    const timestamp = Date.now();
    const filename = `${model.id}/${timestamp}.${ext}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Try uploading to portfolio bucket (which should exist)
    // Premium content will be stored in a subfolder
    const storagePath = `premium/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Premium upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Return storage path — callers should store this in the DB, not a signed URL.
    // Signed URLs expire; storage paths can be re-signed on demand at render time.
    // IMPORTANT: The 'portfolio' bucket should be set to PRIVATE in the Supabase dashboard
    // to prevent direct URL access to premium content
    const { data: signedUrlData } = await supabase.storage
      .from("portfolio")
      .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry for immediate preview

    return NextResponse.json({
      success: true,
      url: storagePath, // Storage path for DB storage (won't expire)
      signedUrl: signedUrlData?.signedUrl || null, // Temporary URL for immediate preview
      storagePath, // Explicit storage path
      mediaType: isImage ? "image" : "video",
    });
  } catch (error) {
    logger.error("Premium upload route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
