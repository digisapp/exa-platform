import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = [
  "image/gif",
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/apng",
];
const ANIMATED_TYPES = new Set(["image/gif", "image/webp", "image/apng"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — keep stickers light

async function requireAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", userId)
    .single();
  if (!actor || actor.type !== "admin") return null;
  return actor as { id: string; type: string };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sticker";
}

/** GET — list ALL stickers (incl. inactive) for admin management */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await requireAdmin(supabase, user.id);
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminDb = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = (adminDb as any)
      .from("exa_stickers")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) {
      logger.error("[Admin Stickers] List error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stickers: data || [] });
  } catch (error) {
    logger.error("[Admin Stickers] GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — upload a new sticker */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const actor = await requireAdmin(supabase, user.id);
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string | null)?.trim() || "";
    const description = (formData.get("description") as string | null)?.trim() || null;
    const category = (formData.get("category") as string | null)?.trim() || null;
    const tagsRaw = (formData.get("tags") as string | null)?.trim() || "";
    const modelId = (formData.get("modelId") as string | null) || null;
    const isFeatured = formData.get("isFeatured") === "true";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid type. Allowed: GIF, WebP, PNG, JPEG, APNG" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
    }

    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // For animated formats keep as-is to preserve animation.
    // For static formats, strip EXIF and clamp to 512x512 (sticker-sized).
    let outBuffer: Buffer | Uint8Array = inputBuffer;
    let outContentType = file.type;
    let width: number | null = null;
    let height: number | null = null;

    if (ANIMATED_TYPES.has(file.type)) {
      try {
        const meta = await sharp(inputBuffer, { animated: true }).metadata();
        width = meta.width ?? null;
        // sharp reports animated GIF height as total filmstrip; divide by frames
        height = meta.pageHeight ?? meta.height ?? null;
      } catch {
        // ignore — metadata is best-effort
      }
    } else if (isProcessableImage(file.type)) {
      try {
        const processed = await processImage(inputBuffer, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 90,
          format: file.type === "image/png" ? "png" : "webp",
        });
        outBuffer = processed.buffer;
        outContentType = processed.contentType;
        width = processed.width;
        height = processed.height;
      } catch (e) {
        logger.error("[Admin Stickers] processImage failed, uploading original", e);
      }
    }

    const adminDb = createServiceRoleClient();

    const ext = (() => {
      if (outContentType === "image/gif") return "gif";
      if (outContentType === "image/webp") return "webp";
      if (outContentType === "image/png") return "png";
      if (outContentType === "image/apng") return "apng";
      return "jpg";
    })();
    const storagePath = `library/${slugify(name)}-${Date.now()}.${ext}`;

    const { error: uploadError } = await adminDb.storage
      .from("stickers")
      .upload(storagePath, outBuffer, {
        contentType: outContentType,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      logger.error("[Admin Stickers] Upload error", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = adminDb.storage
      .from("stickers")
      .getPublicUrl(storagePath);

    const { data: sticker, error: insertError } = await (adminDb as any)
      .from("exa_stickers")
      .insert({
        name,
        description,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: outContentType,
        width,
        height,
        size_bytes: (outBuffer as Buffer).length ?? null,
        tags,
        category,
        model_id: modelId || null,
        is_featured: isFeatured,
        is_active: true,
        created_by: actor.id,
      })
      .select("*")
      .single();

    if (insertError) {
      // Roll back the storage upload to avoid orphans
      await adminDb.storage.from("stickers").remove([storagePath]);
      logger.error("[Admin Stickers] Insert error", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ sticker });
  } catch (error) {
    logger.error("[Admin Stickers] POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
