import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

    // Fetch all reserved usernames
    const { data: usernames, error } = await (supabase
      .from("reserved_usernames") as any)
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
