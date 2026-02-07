import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET /api/brands/tags - Get all unique tags used by this brand
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
  if (rateLimitResponse) return rateLimitResponse;

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can access tags" }, { status: 403 });
  }

  // Get all notes with tags for this brand
  const { data: notes, error } = await supabase
    .from("brand_model_notes")
    .select("tags")
    .eq("brand_id", actor.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract unique tags and count usage
  const tagCounts: Record<string, number> = {};
  for (const note of notes || []) {
    for (const tag of note.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Sort by usage count
  const tags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({ tags });
}
