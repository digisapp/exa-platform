import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    let balance = 0;

    if (actor.type === "model") {
      const { data } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single() as { data: { coin_balance: number } | null };
      balance = data?.coin_balance ?? 0;
    } else if (actor.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", actor.id)
        .single() as { data: { coin_balance: number } | null };
      balance = data?.coin_balance ?? 0;
    } else if (actor.type === "brand") {
      const { data } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("id", actor.id)
        .single() as { data: { coin_balance: number } | null };
      balance = data?.coin_balance ?? 0;
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
