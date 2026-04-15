import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "search", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();
    if (!q || q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    // Search models by username
    const { data: models } = await supabase
      .from("models")
      .select("username, first_name, profile_photo_url")
      .not("username", "is", null)
      .not("user_id", "is", null)
      .ilike("username", `${q}%`)
      .limit(5);

    // Search fans by username
    const { data: fans } = await supabase
      .from("fans")
      .select("username, display_name, avatar_url")
      .not("username", "is", null)
      .ilike("username", `${q}%`)
      .limit(5);

    const users = [
      ...(models || []).map((m: any) => ({
        username: m.username,
        display_name: m.first_name || m.username,
        avatar_url: m.profile_photo_url,
        actor_type: "model",
      })),
      ...(fans || []).map((f: any) => ({
        username: f.username,
        display_name: f.display_name || f.username,
        avatar_url: f.avatar_url,
        actor_type: "fan",
      })),
    ].slice(0, 5);

    return NextResponse.json({ users });
  } catch (error) {
    logger.error("Search users error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
