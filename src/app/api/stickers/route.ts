import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** GET — list active stickers for the picker */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "120", 10) || 120, 200);

    const db = createServiceRoleClient();
    let query = (db as any)
      .from("exa_stickers")
      .select("id, name, url, mime_type, width, height, category, tags, is_featured, model_id")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);

    if (search) {
      // Match on name or any tag containing the search term
      query = query.or(
        `name.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    const { data, error } = await query;
    if (error) {
      logger.error("[Stickers] List error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stickers: data || [] });
  } catch (error) {
    logger.error("[Stickers] GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — increment sticker use_count (fire-and-forget telemetry) */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const db = createServiceRoleClient();
    await (db as any).rpc("increment_exa_sticker_use", { p_sticker_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Stickers] POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
