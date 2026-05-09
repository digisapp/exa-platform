import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function requireAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

/** GET /api/admin/stickers/model-portfolio?modelId=... — pull a model's photos for sticker generation */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await requireAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");
    if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });

    const adminDb = createServiceRoleClient();

    const { data: model } = await (adminDb as any)
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url")
      .eq("id", modelId)
      .single();

    if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });

    const { data: assets, error } = await (adminDb as any)
      .from("media_assets")
      .select("id, url, photo_url, mime_type, width, height, type, asset_type, is_primary, display_order, storage_path")
      .eq("model_id", modelId)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(80);

    if (error) {
      logger.error("[Sticker model-portfolio] error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to image assets (skip videos — sharp can't process them without ffmpeg)
    const images = (assets || []).filter((a: any) => {
      const mime = (a.mime_type || "").toLowerCase();
      const isVideo = mime.startsWith("video/") || a.type === "video";
      return !isVideo && (a.url || a.photo_url);
    });

    return NextResponse.json({ model, assets: images });
  } catch (error) {
    logger.error("[Sticker model-portfolio] route error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
