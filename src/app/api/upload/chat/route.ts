import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { CHAT_MEDIA_BUCKET } from "@/lib/chat-media";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

// Admin client for creating signed URLs
const adminClient = createServiceRoleClient();

// POST - Get a signed upload URL for chat media. Unlike /api/upload/signed-url
// (the portfolio pipeline), this targets the PRIVATE chat-media bucket: chat
// attachments must never be public-read, and must never be cross-posted into
// the model's portfolio. See src/lib/chat-media.ts for the URL convention.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Actor-scoped, not model-only: fans could attach small photos through
    // the old /api/upload branch, so chat media stays open to any actor type.
    // Paths are namespaced by actor id, which the send route's ownership
    // check verifies against the sender.
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };
    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing fileName, fileType, or fileSize" },
        { status: 400 }
      );
    }

    // Determine file type category
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(fileType);

    if (!isImage && !isVideo && !isAudio) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC, MP4, MOV, WebM, audio files" },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? "500MB" : "50MB";
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxLabel}` },
        { status: 400 }
      );
    }

    // Generate unique filename - derive extension from validated MIME type, not user filename
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "image/heic": "heic", "image/heif": "heif",
      "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
      "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav",
    };
    const defaultExt = isVideo ? "mp4" : isAudio ? "webm" : "jpg";
    const ext = MIME_TO_EXT[fileType] || defaultExt;
    const timestamp = Date.now();
    const storagePath = `${actor.id}/${timestamp}.${ext}`;

    // Create signed upload URL (valid for 1 hour). The bucket has no client
    // policies — this service-generated URL is the only way in.
    const { data: signedData, error: signedError } = await adminClient.storage
      .from(CHAT_MEDIA_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (signedError) {
      logger.error("Chat media signed URL error", signedError);
      return NextResponse.json(
        { error: `Failed to create upload URL: ${signedError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      storagePath,
      // Data needed for the completion step
      uploadMeta: {
        isVideo,
        isAudio,
        fileType,
        fileSize,
      },
    });
  } catch (error) {
    logger.error("Chat media signed URL route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
