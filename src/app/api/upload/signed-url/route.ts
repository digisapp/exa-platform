import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Admin client for creating signed URLs
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Get a signed URL for direct upload to Supabase Storage
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

    // Get model ID
    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    const { fileName, fileType, fileSize, title } = await request.json();

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
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM, audio files" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Generate unique filename with proper extension fallback
    const defaultExt = isVideo ? "mp4" : isAudio ? "webm" : "jpg";
    const ext = fileName.split(".").pop() || defaultExt;
    const timestamp = Date.now();
    const storagePath = `${modelId}/${timestamp}.${ext}`;
    const bucket = "portfolio";

    // Create signed upload URL (valid for 1 hour)
    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return NextResponse.json(
        { error: `Failed to create upload URL: ${signedError.message}` },
        { status: 500 }
      );
    }

    // Get actor ID for later media asset creation
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Return the signed URL and metadata needed to complete the upload
    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
      storagePath,
      bucket,
      // Include data needed for the completion step
      uploadMeta: {
        modelId,
        actorId: actor.id,
        isVideo,
        isAudio,
        title: title || null,
        fileType,
        fileSize,
      },
    });
  } catch (error) {
    console.error("Signed URL route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
