import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rating } = body;

    // Validate rating (1-5 or null to clear)
    if (rating !== null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be 1-5 or null" }, { status: 400 });
    }

    const { error } = await (supabase
      .from("models") as any)
      .update({ admin_rating: rating, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, rating });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update rating";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
