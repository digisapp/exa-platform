import { createClient } from "@/lib/supabase/server";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// POST - Handle small files directly OR create signed URL for large files
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model ID
    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = (formData.get("type") as string) || "portfolio";
    const title = (formData.get("title") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine if it's an image or video
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Use portfolio bucket for both photos and videos
    const bucket = "portfolio";

    // Convert File to ArrayBuffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process image to strip EXIF data (contains GPS, camera info, etc.)
    let processedBuffer: Buffer | Uint8Array = inputBuffer;
    let finalContentType = file.type;

    if (isImage && isProcessableImage(file.type) && file.type !== "image/gif") {
      // Don't process GIFs as they may lose animation
      try {
        const processed = await processImage(inputBuffer, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 85,
        });
        processedBuffer = processed.buffer;
        finalContentType = processed.contentType;
      } catch (processError) {
        console.error("Image processing error, uploading original:", processError);
        // Fall back to original if processing fails
      }
    }

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/quicktime": "mov",
      "video/webm": "webm",
    };
    const ext = extMap[finalContentType] || (isVideo ? "mp4" : "jpg");
    const timestamp = Date.now();
    const filename = `${modelId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, processedBuffer, {
        contentType: finalContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filename);

    // Determine asset_type based on file type
    const assetType = isVideo ? "video" : "portfolio";

    // Get actor ID for owner_id
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Create media_asset record
    const { data: mediaAsset, error: mediaError } = await (supabase
      .from("media_assets") as any)
      .insert({
        owner_id: actor.id,
        model_id: modelId,
        type: isVideo ? "video" : "photo",
        asset_type: assetType,
        photo_url: isImage ? publicUrl : null,
        url: publicUrl,
        storage_path: filename,
        mime_type: finalContentType,
        size_bytes: processedBuffer.length,
        title: title,
      })
      .select()
      .single();

    if (mediaError) {
      console.error("Media asset error:", mediaError);
      return NextResponse.json(
        { error: `Failed to save media record: ${mediaError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaAsset,
      assetType,
    });
  } catch (error) {
    console.error("Upload media route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Route segment config to increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
