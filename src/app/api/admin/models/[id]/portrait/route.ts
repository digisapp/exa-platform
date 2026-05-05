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

    const adminDb = createServiceRoleClient();

    const { data: model } = await adminDb
      .from("models")
      .select("id, username")
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

    let processedBuffer: Buffer | Uint8Array = inputBuffer;
    let finalContentType = file.type;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;

    if (isProcessableImage(file.type)) {
      try {
        const processed = await processImage(inputBuffer, {
          maxWidth: 900,
          maxHeight: 1200,
          quality: 90,
        });
        processedBuffer = processed.buffer;
        finalContentType = processed.contentType;
        finalWidth = processed.width;
        finalHeight = processed.height;
      } catch (processError) {
        logger.error("[Admin Portrait] Image processing error, uploading original", processError);
      }
    }

    const timestamp = Date.now();
    const storagePath = `admin-upload/${modelId}/${timestamp}-portrait.jpg`;

    const { error: uploadError } = await adminDb.storage
      .from("portfolio")
      .upload(storagePath, processedBuffer, {
        contentType: finalContentType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("[Admin Portrait] Storage upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = adminDb.storage
      .from("portfolio")
      .getPublicUrl(storagePath);

    // Clear existing primary portraits
    await (adminDb as any)
      .from("content_items")
      .update({ is_primary: false })
      .eq("model_id", modelId)
      .eq("is_primary", true);

    // Insert new content item marked as primary portrait
    const { data: newItem, error: insertError } = await (adminDb as any)
      .from("content_items")
      .insert({
        model_id: modelId,
        media_url: publicUrl,
        media_type: "image",
        status: "portfolio",
        is_primary: true,
        width: finalWidth,
        height: finalHeight,
        coin_price: 0,
        position: 0,
      })
      .select("id")
      .single();

    if (insertError || !newItem) {
      logger.error("[Admin Portrait] Content item insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create portrait record" },
        { status: 500 }
      );
    }

    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.MODEL_PHOTO_UPDATED,
      targetType: "model",
      targetId: modelId,
      oldValues: {},
      newValues: { portrait_content_item_id: newItem.id, portrait_url: publicUrl, source: "admin-upload" },
    });

    return NextResponse.json({
      success: true,
      id: newItem.id,
      url: publicUrl,
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    logger.error("[Admin Portrait] Route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
