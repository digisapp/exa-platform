import { createClient } from "@/lib/supabase/server";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = (formData.get("type") as string) || "portfolio"; // 'portfolio' | 'message' | 'avatar'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process image to strip EXIF data (contains GPS, camera info, etc.)
    let processedBuffer: Buffer | Uint8Array = inputBuffer;
    let finalContentType = file.type;

    if (isProcessableImage(file.type) && file.type !== "image/gif") {
      // Don't process GIFs as they may lose animation
      try {
        const processed = await processImage(inputBuffer, {
          maxWidth: uploadType === "avatar" ? 1200 : 2048,
          maxHeight: uploadType === "avatar" ? 1200 : 2048,
          quality: uploadType === "avatar" ? 90 : 85,
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
    };
    const ext = extMap[finalContentType] || "jpg";
    const timestamp = Date.now();
    const filename = `${actor.id}/${timestamp}.${ext}`;

    // Determine bucket based on upload type
    const bucket = uploadType === "avatar" ? "avatars" : "portfolio";

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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

    // Create media_asset record
    const { data: mediaAsset, error: mediaError } = await (supabase
      .from("media_assets") as any)
      .insert({
        owner_id: actor.id,
        type: "photo",
        storage_path: filename,
        url: publicUrl,
        mime_type: finalContentType,
        size_bytes: processedBuffer.length,
        source: uploadType,
        is_primary: false,
        display_order: 0,
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

    // If portfolio photo and user is a model, award points
    let pointsAwarded = 0;
    if (uploadType === "portfolio" && actor.type === "model") {
      // Get model ID (models.id != actors.id)
      const modelId = await getModelId(supabase, user.id);
      if (modelId) {
        const { error: pointsError } = await (supabase.rpc as any)("award_points", {
          p_model_id: modelId,
          p_action: "portfolio_photo",
          p_points: 10,
          p_metadata: { photo_id: mediaAsset.id },
        });

        if (!pointsError) {
          pointsAwarded = 10;
        }
      }
    }

    // If avatar upload, update the model's profile_photo_url
    if (uploadType === "avatar" && actor.type === "model") {
      // Get model ID (models.id != actors.id)
      const modelId = await getModelId(supabase, user.id);
      if (modelId) {
        await (supabase
          .from("models") as any)
          .update({ profile_photo_url: publicUrl })
          .eq("id", modelId);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaAsset,
      pointsAwarded,
    });
  } catch (error) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a media asset
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("id");

    if (!mediaId) {
      return NextResponse.json(
        { error: "Media ID required" },
        { status: 400 }
      );
    }

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    // Get media asset to verify ownership and get storage path
    const { data: mediaAsset } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaId)
      .eq("owner_id", actor.id)
      .single() as { data: { id: string; storage_path: string; source: string } | null };

    if (!mediaAsset) {
      return NextResponse.json(
        { error: "Media not found or not owned by user" },
        { status: 404 }
      );
    }

    // Delete from storage
    const bucket = mediaAsset.source === "avatar" ? "avatars" : "portfolio";
    await supabase.storage.from(bucket).remove([mediaAsset.storage_path]);

    // Delete record
    await (supabase.from("media_assets") as any).delete().eq("id", mediaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
