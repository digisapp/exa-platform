import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import {
  generateStickerFromUrl,
  type StickerFrameStyle,
} from "@/lib/sticker-frames";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin" ? actor : null;
}

const bodySchema = z.object({
  mediaAssetId: z.string().uuid(),
  frameStyle: z.enum(["neon", "gold", "circle", "polaroid", "plain"]).default("neon"),
  name: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional().default("models"),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  isFeatured: z.boolean().optional(),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sticker";
}

/** POST /api/admin/stickers/from-asset — generate an EXA sticker from a model's media_asset */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const actor = await requireAdmin(supabase, user.id);
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { mediaAssetId, frameStyle, name, category, tags, isFeatured } = parsed.data;

    const adminDb = createServiceRoleClient();

    // Resolve the media asset and its model
    const { data: asset, error: assetError } = await (adminDb as any)
      .from("media_assets")
      .select("id, url, photo_url, mime_type, model_id, type")
      .eq("id", mediaAssetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const sourceUrl: string | null = asset.url || asset.photo_url || null;
    if (!sourceUrl) {
      return NextResponse.json({ error: "Asset has no source URL" }, { status: 400 });
    }
    if ((asset.mime_type || "").startsWith("video/") || asset.type === "video") {
      return NextResponse.json(
        { error: "Video assets aren't supported yet (no ffmpeg)" },
        { status: 400 }
      );
    }

    // Look up model for default name + linkage
    let modelLabel = "model";
    const modelId: string | null = asset.model_id || null;
    if (modelId) {
      const { data: model } = await (adminDb as any)
        .from("models")
        .select("username, first_name, last_name")
        .eq("id", modelId)
        .single();
      if (model) {
        modelLabel = model.username || `${model.first_name || ""} ${model.last_name || ""}`.trim() || "model";
      }
    }

    const finalName = (name?.trim() || `${modelLabel} ${frameStyle}`).slice(0, 80);

    // Generate the sticker
    let stickerBuffer: Buffer;
    let stickerWidth = 512;
    let stickerHeight = 512;
    try {
      const out = await generateStickerFromUrl(sourceUrl, frameStyle as StickerFrameStyle);
      stickerBuffer = out.buffer;
      stickerWidth = out.width;
      stickerHeight = out.height;
    } catch (e: any) {
      logger.error("[Sticker from-asset] generation failed", e);
      return NextResponse.json(
        { error: `Generation failed: ${e?.message || "unknown"}` },
        { status: 500 }
      );
    }

    const storagePath = `models/${modelId || "unknown"}/${slugify(modelLabel)}-${frameStyle}-${Date.now()}.png`;

    const { error: uploadError } = await adminDb.storage
      .from("stickers")
      .upload(storagePath, stickerBuffer, {
        contentType: "image/png",
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      logger.error("[Sticker from-asset] upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = adminDb.storage
      .from("stickers")
      .getPublicUrl(storagePath);

    const finalTags = Array.from(
      new Set([
        ...(tags || []),
        modelLabel.toLowerCase(),
        frameStyle,
        "model",
      ].map((t) => t.replace(/^@/, "").toLowerCase()))
    ).filter(Boolean);

    const { data: sticker, error: insertError } = await (adminDb as any)
      .from("exa_stickers")
      .insert({
        name: finalName,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: "image/png",
        width: stickerWidth,
        height: stickerHeight,
        size_bytes: stickerBuffer.length,
        tags: finalTags,
        category: category || "models",
        model_id: modelId,
        is_featured: !!isFeatured,
        is_active: true,
        created_by: actor.id,
      })
      .select("*")
      .single();

    if (insertError) {
      await adminDb.storage.from("stickers").remove([storagePath]);
      logger.error("[Sticker from-asset] insert error", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ sticker });
  } catch (error) {
    logger.error("[Sticker from-asset] route error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
