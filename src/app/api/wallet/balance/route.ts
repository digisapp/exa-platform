import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      const { data } = await (supabase
        .from("brands") as any)
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
