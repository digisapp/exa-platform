import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

async function isAdmin(supabase: any, userId: string) {
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
    const { id: modelId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify model exists
    const adminDb = createServiceRoleClient();
    const { data: model } = await adminDb
      .from("models")
      .select("id, username, profile_photo_url")
      .eq("id", modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 15MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process image: strip EXIF, resize to 1200x1200 max
    let processedBuffer: Buffer | Uint8Array = inputBuffer;
    let finalContentType = file.type;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;

    if (isProcessableImage(file.type)) {
      try {
        const processed = await processImage(inputBuffer, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 90,
        });
        processedBuffer = processed.buffer;
        finalContentType = processed.contentType;
        finalWidth = processed.width;
        finalHeight = processed.height;
      } catch (processError) {
        logger.error("[Admin Photo] Image processing error, uploading original", processError);
      }
    }

    // Upload to avatars bucket
    const timestamp = Date.now();
    const filename = `admin-upload/${modelId}/${timestamp}.jpg`;

    const { error: uploadError } = await adminDb.storage
      .from("avatars")
      .upload(filename, processedBuffer, {
        contentType: finalContentType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("[Admin Photo] Storage upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = adminDb.storage
      .from("avatars")
      .getPublicUrl(filename);

    // Update the model's profile photo
    const oldPhotoUrl = (model as any).profile_photo_url;
    const { error: updateError } = await adminDb
      .from("models")
      .update({
        profile_photo_url: publicUrl,
        profile_photo_width: finalWidth,
        profile_photo_height: finalHeight,
        updated_at: new Date().toISOString(),
      })
      .eq("id", modelId);

    if (updateError) {
      logger.error("[Admin Photo] Model update error", updateError);
      return NextResponse.json(
        { error: `Failed to update model: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Create media_asset record
    await adminDb
      .from("media_assets")
      .insert({
        owner_id: modelId,
        model_id: modelId,
        type: "photo",
        asset_type: "avatar",
        storage_path: filename,
        url: publicUrl,
        mime_type: finalContentType,
        size_bytes: processedBuffer.length,
        source: "admin-upload",
        is_primary: false,
        display_order: 0,
      });

    // Log admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.MODEL_PHOTO_UPDATED,
      targetType: "model",
      targetId: modelId,
      oldValues: { profile_photo_url: oldPhotoUrl },
      newValues: { profile_photo_url: publicUrl },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    logger.error("[Admin Photo] Route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
