import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Configure route to accept larger body sizes
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  try {
    // Parse form data first to get upload type
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = (formData.get("type") as string) || "portfolio";

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit all upload types
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
        { error: "File too large. Maximum size is 15MB" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[file.type] || "jpg";
    const timestamp = Date.now();
    const filename = `${actor.id}/${timestamp}.${ext}`;

    // For AI source images, use a simplified upload path (no processing, no media_asset record)
    if (uploadType === "ai-source") {
      const aiStorageClient = createServiceRoleClient();
      const { error: uploadError } = await aiStorageClient.storage
        .from("portfolio")
        .upload(filename, inputBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        logger.error("[Upload API] Storage upload error", uploadError);
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = aiStorageClient.storage
        .from("portfolio")
        .getPublicUrl(filename);

      return NextResponse.json({
        success: true,
        url: publicUrl,
      });
    }

    // Process image to strip EXIF data (contains GPS, camera info, etc.)
    let processedBuffer: Buffer | Uint8Array = inputBuffer;
    let finalContentType = file.type;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;

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
        finalWidth = processed.width;
        finalHeight = processed.height;
      } catch (processError) {
        logger.error("Image processing error, uploading original", processError);
        // Fall back to original if processing fails
      }
    }

    // Determine bucket based on upload type
    const bucket = uploadType === "avatar" ? "avatars" : "portfolio";

    // Use service role client for all storage uploads — the user is already authenticated
    // and validated above, and there are no RLS policies on storage.objects
    const storageClient = createServiceRoleClient();

    // Upload to Supabase Storage
    const { error: uploadError } = await storageClient.storage
      .from(bucket)
      .upload(filename, processedBuffer, {
        contentType: finalContentType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = storageClient.storage.from(bucket).getPublicUrl(filename);

    // Get model_id for the media_asset record
    const modelId = actor.type === "model" ? await getModelId(supabase, user.id) : null;

    // Create media_asset record using service role to bypass RLS
    const adminDb = createServiceRoleClient();
    const { data: mediaAsset, error: mediaError } = await adminDb
      .from("media_assets")
      .insert({
        owner_id: actor.id,
        model_id: modelId,
        type: "photo",
        asset_type: uploadType === "avatar" ? "avatar" : "portfolio",
        photo_url: uploadType !== "avatar" ? publicUrl : null,
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
      logger.error("Media asset error", mediaError);
      return NextResponse.json(
        { error: `Failed to save media record: ${mediaError.message}` },
        { status: 500 }
      );
    }

    // If avatar upload, update the model's profile_photo_url + dimensions
    if (uploadType === "avatar" && modelId) {
      await supabase
        .from("models")
        .update({
          profile_photo_url: publicUrl,
          profile_photo_width: finalWidth,
          profile_photo_height: finalHeight,
        })
        .eq("id", modelId);
    }

    // Also write to content_items (single source of truth for portfolio)
    if (uploadType === "portfolio" && modelId) {
      await (adminDb as any)
        .from("content_items")
        .insert({
          model_id: modelId,
          media_url: publicUrl,
          media_type: "image",
          status: "portfolio",
          width: finalWidth,
          height: finalHeight,
        });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaAsset,
    });
  } catch (error) {
    logger.error("Upload route error", error);
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

    // Get model_id for ownership check
    const modelId = await getModelId(supabase, user.id);

    // Get media asset to verify ownership and get storage path
    // Check both owner_id (actor) and model_id for backwards compatibility
    const { data: mediaAsset } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", mediaId)
      .or(`owner_id.eq.${actor.id}${modelId ? `,model_id.eq.${modelId}` : ""}`)
      .single() as { data: { id: string; storage_path: string; source: string; url: string; model_id: string | null } | null };

    if (!mediaAsset) {
      return NextResponse.json(
        { error: "Media not found or not owned by user" },
        { status: 404 }
      );
    }

    // Delete from storage using service role client (no storage RLS policies)
    const deleteClient = createServiceRoleClient();
    const bucket = mediaAsset.source === "avatar" ? "avatars" : "portfolio";
    await deleteClient.storage.from(bucket).remove([mediaAsset.storage_path]);

    // Delete record from media_assets
    await deleteClient.from("media_assets").delete().eq("id", mediaId);

    // Also delete matching content_items record
    if (mediaAsset.model_id && mediaAsset.url) {
      await (deleteClient as any)
        .from("content_items")
        .delete()
        .eq("model_id", mediaAsset.model_id)
        .eq("media_url", mediaAsset.url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
