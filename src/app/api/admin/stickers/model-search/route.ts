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

/** GET /api/admin/stickers/model-search?q=... — find models for the sticker generator */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await requireAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const adminDb = createServiceRoleClient();
    let query = (adminDb as any)
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url")
      .eq("is_approved", true)
      .order("username", { ascending: true })
      .limit(40);

    if (q) {
      const safe = q.replace(/[%,]/g, "");
      query = query.or(
        `username.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`
      );
    } else {
      query = query.eq("is_featured", true).limit(40);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("[Sticker model-search] error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ models: data || [] });
  } catch (error) {
    logger.error("[Sticker model-search] route error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
