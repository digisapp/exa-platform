import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { processImage } from "@/lib/image-processing";

export const runtime = "nodejs";

const uploadCompleteSchema = z.object({
  storagePath: z.string().min(1),
  bucket: z.string().min(1),
  uploadMeta: z.object({
    isVideo: z.boolean().optional(),
    isAudio: z.boolean().optional(),
    title: z.string().nullish(),
    fileType: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
  }),
});

// Admin client for verifying uploads exist
const adminClient = createServiceRoleClient();

// POST - Complete the upload by creating the media asset record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get model and actor IDs server-side - NEVER trust client-submitted IDs
    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    const actorId = actor.id;

    const body = await request.json();
    const parsed = uploadCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { storagePath, bucket, uploadMeta } = parsed.data;

    // Security: Verify the storage path belongs to this user
    if (!storagePath.startsWith(`${modelId}/`)) {
      return NextResponse.json(
        { error: "Storage path does not belong to this user" },
        { status: 403 }
      );
    }

    // Verify the file actually exists in storage by checking file metadata
    const fileName = storagePath.replace(`${modelId}/`, "");
    const { data: files, error: listError } = await adminClient.storage
      .from(bucket)
      .list(modelId, { limit: 100 });

    const fileExists = files?.some((f) => f.name === fileName);

    if (listError) {
      logger.error("Storage list error", listError);
      // Don't block upload on list errors - the ownership check is the critical security gate
    } else if (!fileExists) {
      return NextResponse.json(
        { error: "File not found in storage. Please upload the file first." },
        { status: 400 }
      );
    }

    const { isVideo, isAudio, title, fileType, fileSize } = uploadMeta;

    // Normalize image: bake EXIF orientation into pixels and capture dimensions.
    // Browser direct-uploads via signed URL skip server-side image processing,
    // so iPhone photos with an EXIF Orientation tag stay landscape on disk and
    // render sideways anywhere EXIF isn't honored (next/og flyers, Satori, etc).
    let normalizedMime = fileType;
    let normalizedSize = fileSize;
    let normalizedWidth: number | null = null;
    let normalizedHeight: number | null = null;
    if (!isVideo && !isAudio && fileType.startsWith("image/")) {
      try {
        const { data: blob, error: dlErr } = await adminClient.storage
          .from(bucket)
          .download(storagePath);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await blob.arrayBuffer());
        const processed = await processImage(buf, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 90,
        });
        const { error: upErr } = await adminClient.storage
          .from(bucket)
          .upload(storagePath, processed.buffer, {
            contentType: processed.contentType,
            upsert: true,
          });
        if (upErr) throw upErr;
        normalizedMime = processed.contentType;
        normalizedSize = processed.buffer.length;
        normalizedWidth = processed.width;
        normalizedHeight = processed.height;
      } catch (normalizeError) {
        logger.error("[upload/complete] Image normalize failed", normalizeError, {
          storage_path: storagePath,
          model_id: modelId,
        });
        // Fall through — better to record the asset than to fail the upload
      }
    }

    // Get public URL (after potential overwrite)
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // Determine asset_type based on file type
    const assetType = isVideo ? "video" : isAudio ? "audio" : "portfolio";

    // Determine the media type
    const mediaTypeValue = isVideo ? "video" : isAudio ? "audio" : "photo";

    // Create media_asset record using admin client to bypass RLS
    // This ensures the INSERT cannot fail due to RLS policy issues
    const insertData = {
      owner_id: actorId,
      model_id: modelId,
      type: mediaTypeValue,
      asset_type: assetType,
      photo_url: !isVideo && !isAudio ? publicUrl : null,
      url: publicUrl,
      storage_path: storagePath,
      mime_type: normalizedMime,
      size_bytes: normalizedSize,
      title: title,
    };

    const { data: mediaAsset, error: mediaError } = await adminClient
      .from("media_assets")
      .insert(insertData)
      .select()
      .single();

    if (mediaError) {
      // Log detailed error info for debugging
      logger.error("Media asset INSERT failed", mediaError, {
        user_id: user.id,
        model_id: modelId,
        actor_id: actorId,
        storage_path: storagePath,
        bucket,
      });
      return NextResponse.json(
        { error: `Failed to save media record: ${mediaError.message}` },
        { status: 500 }
      );
    }

    // Also write to content_items (single source of truth for portfolio/video)
    if (modelId && (assetType === "portfolio" || assetType === "video")) {
      await (adminClient as any)
        .from("content_items")
        .insert({
          model_id: modelId,
          title: title || null,
          media_url: publicUrl,
          media_type: isVideo ? "video" : "image",
          status: "portfolio",
          ...(normalizedWidth !== null ? { width: normalizedWidth } : {}),
          ...(normalizedHeight !== null ? { height: normalizedHeight } : {}),
        });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      storagePath,
      mediaAsset,
      assetType,
    });
  } catch (error) {
    logger.error("Upload complete route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
