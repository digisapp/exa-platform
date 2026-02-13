import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { processImage } from "@/lib/image-processing";

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

    if (!delivery || delivery.model_id !== modelId) {
      return NextResponse.json({ error: "Delivery not found or not yours" }, { status: 403 });
    }

    // Check file count limit
    const { count } = await adminClient
      .from("delivery_files" as any)
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId) as { count: number | null };

    if ((count || 0) >= 20) {
      return NextResponse.json({ error: "Maximum 20 files per delivery" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB" }, { status: 400 });
    }

    let uploadBuffer: Buffer;
    let contentType = file.type;

    if (isImage && file.type !== "image/gif") {
      // Process image: strip EXIF, resize
      const arrayBuffer = await file.arrayBuffer();
      const processed = await processImage(Buffer.from(arrayBuffer), {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 85,
      });
      uploadBuffer = processed.buffer;
      contentType = processed.contentType;
    } else {
      // Videos and GIFs: upload as-is
      const arrayBuffer = await file.arrayBuffer();
      uploadBuffer = Buffer.from(arrayBuffer);
    }

    // Generate storage path
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
    };
    const ext = MIME_TO_EXT[contentType] || (isVideo ? "mp4" : "jpg");
    const timestamp = Date.now();
    const storagePath = `deliveries/${modelId}/${deliveryId}/${timestamp}.${ext}`;

    const { error: uploadError } = await adminClient.storage
      .from("portfolio")
      .upload(storagePath, uploadBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage
      .from("portfolio")
      .getPublicUrl(storagePath);

    const fileTypeCategory = isImage ? "image" : "video";

    const { data: fileRecord, error: insertError } = await adminClient
      .from("delivery_files" as any)
      .insert({
        delivery_id: deliveryId,
        file_name: file.name,
        storage_path: storagePath,
        url: urlData.publicUrl,
        mime_type: contentType,
        size_bytes: uploadBuffer.length,
        file_type: fileTypeCategory,
      })
      .select()
      .single() as { data: any; error: any };

    if (insertError || !fileRecord) {
      console.error("Failed to create delivery file record:", insertError);
      return NextResponse.json({ error: "Failed to record file" }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord });
  } catch (error) {
    console.error("Direct delivery upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
