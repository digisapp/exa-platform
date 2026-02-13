import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const adminClient = createServiceRoleClient();

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify item exists
    const { data: item } = await adminClient.from("content_library" as any)
      .select("id")
      .eq("id", itemId)
      .maybeSingle() as { data: any };

    if (!item) {
      return NextResponse.json({ error: "Library item not found" }, { status: 404 });
    }

    // Check file count limit
    const { count } = await adminClient.from("content_library_files" as any)
      .select("id", { count: "exact", head: true })
      .eq("library_item_id", itemId) as { count: number | null };

    if ((count || 0) >= 20) {
      return NextResponse.json({ error: "Maximum 20 files per library item" }, { status: 400 });
    }

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: "Missing fileName, fileType, or fileSize" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB" }, { status: 400 });
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
    };
    const ext = MIME_TO_EXT[fileType] || (isVideo ? "mp4" : "jpg");
    const timestamp = Date.now();
    const storagePath = `content-library/${itemId}/${timestamp}.${ext}`;
    const bucket = "portfolio";

    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return NextResponse.json({ error: `Failed to create upload URL: ${signedError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
      storagePath,
      bucket,
      uploadMeta: {
        itemId,
        isVideo,
        fileType,
        fileSize,
        fileName,
      },
    });
  } catch (error) {
    console.error("Library signed URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
