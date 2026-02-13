import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const adminClient = createServiceRoleClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResult) return rateLimitResult;

    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    // Verify delivery exists and belongs to this model
    const { data: delivery } = await adminClient
      .from("content_deliveries" as any)
      .select("id, model_id")
      .eq("id", deliveryId)
      .maybeSingle() as { data: any };

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    if (delivery.model_id !== modelId) {
      return NextResponse.json({ error: "Not your delivery" }, { status: 403 });
    }

    // Check file count limit (20 files per delivery)
    const { count } = await adminClient
      .from("delivery_files" as any)
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId) as { count: number | null };

    if ((count || 0) >= 20) {
      return NextResponse.json({ error: "Maximum 20 files per delivery" }, { status: 400 });
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

    // Generate storage path
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
    };
    const ext = MIME_TO_EXT[fileType] || (isVideo ? "mp4" : "jpg");
    const timestamp = Date.now();
    const storagePath = `deliveries/${modelId}/${deliveryId}/${timestamp}.${ext}`;
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
        modelId,
        deliveryId,
        isVideo,
        fileType,
        fileSize,
        fileName,
      },
    });
  } catch (error) {
    console.error("Delivery signed URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
