import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { escapeIlike } from "@/lib/utils";

async function isAdmin(supabase: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// GET: List models with their Exa Doll status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    if (!(await isAdmin(admin, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const filter = searchParams.get("filter") || "all"; // all | generated | pending
    const search = searchParams.get("search") || "";

    let query = admin
      .from("models")
      .select(
        "id, first_name, last_name, username, country_code, hair_color, eye_color, skin_tone, height, bust, waist, hips, profile_photo_url, focus_tags, exa_doll_image_url, exa_doll_prompt, exa_doll_generated_at, is_approved",
        { count: "exact" }
      )
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .neq("profile_photo_url", "")
      .order("created_at", { ascending: false });

    if (filter === "generated") {
      query = query.not("exa_doll_image_url", "is", null);
    } else if (filter === "pending") {
      query = query.is("exa_doll_image_url", null);
    }

    if (search) {
      const escaped = escapeIlike(search);
      query = query.or(
        `username.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: models, error, count } = await query;

    if (error) {
      console.error("[ExaDolls] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }

    // Get global stats (not just current page)
    const { count: generatedTotal } = await admin
      .from("models")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", true)
      .not("exa_doll_image_url", "is", null);

    return NextResponse.json({
      models: models || [],
      total: count || 0,
      generatedTotal: generatedTotal || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[ExaDolls] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
