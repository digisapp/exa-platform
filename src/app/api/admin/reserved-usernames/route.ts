import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Fetch all reserved usernames
    const { data: usernames, error } = await supabase
      .from("reserved_usernames")
      .select("*")
      .order("username", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ usernames: usernames || [] });
  } catch (error) {
    console.error("Fetch reserved usernames error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reserved usernames" },
      { status: 500 }
    );
  }
}
