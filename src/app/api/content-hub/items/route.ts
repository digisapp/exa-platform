import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { processImage } from "@/lib/image-processing";

export const runtime = "nodejs";

const createItemSchema = z.object({
  media_url: z.string().min(1, "media_url is required"),
  media_type: z.enum(["image", "video"]),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  preview_url: z.string().optional().nullable(),
  status: z.enum(["private", "portfolio", "exclusive"]).default("private"),
  coin_price: z.number().int().min(0).max(10000).default(0),
  tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().datetime().optional().nullable(),
  set_id: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mediaType = searchParams.get("media_type");
    const setId = searchParams.get("set_id");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "500", 10) || 500, 1),
      500,
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    let query = service
      .from("content_items")
      .select("*", { count: "exact" })
      .eq("model_id", modelId);

    if (status) query = query.eq("status", status);
    if (mediaType) query = query.eq("media_type", mediaType);
    if (setId) query = query.eq("set_id", setId);
    if (tag) query = query.contains("tags", [tag]);
    if (search) query = query.ilike("title", `%${search}%`);

    const validSorts = ["created_at", "unlock_count", "coin_price"];
    const sortField = validSorts.includes(sort) ? sort : "created_at";
    query = query
      .order(sortField, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) {
      logger.error("Content items query error", error);
      return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }

    return NextResponse.json({
      items: items || [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Content items GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = createItemSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Normalize freshly-uploaded images: download from storage, bake EXIF
    // rotation into pixels (Satori/next-og ignores EXIF orientation, which made
    // photos taken in portrait on iPhones render sideways in flyers), strip
    // metadata, and capture dimensions. Only runs for images stored as
    // relative paths in the portfolio bucket — full URLs and external sources
    // are left alone.
    let width: number | null = null;
    let height: number | null = null;
    let mediaUrl = parsed.data.media_url;
    if (parsed.data.media_type === "image" && !/^https?:\/\//i.test(mediaUrl)) {
      try {
        const { data: blob, error: dlErr } = await service.storage
          .from("portfolio")
          .download(mediaUrl);
        if (dlErr) throw dlErr;
        const inputBuf = Buffer.from(await blob.arrayBuffer());
        const processed = await processImage(inputBuf, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 90,
        });
        const { error: upErr } = await service.storage
          .from("portfolio")
          .upload(mediaUrl, processed.buffer, {
            contentType: processed.contentType,
            upsert: true,
          });
        if (upErr) throw upErr;
        width = processed.width;
        height = processed.height;
      } catch (normalizeError) {
        logger.error("[content-hub/items] Image normalize failed", normalizeError, {
          media_url: mediaUrl,
          model_id: modelId,
        });
        // Fall through — better to record the item than to fail the upload
      }
    }

    const { data: item, error } = await service
      .from("content_items")
      .insert({
        ...parsed.data,
        media_url: mediaUrl,
        model_id: modelId,
        ...(width !== null ? { width } : {}),
        ...(height !== null ? { height } : {}),
      })
      .select()
      .single();

    if (error) {
      logger.error("Content item insert error", undefined, { message: error.message, details: error.details, code: error.code });
      return NextResponse.json({ error: "Failed to create item", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error("Content items POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
