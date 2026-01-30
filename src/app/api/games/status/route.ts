import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model data with gem balance
    const { data: model } = await supabase
      .from("models")
      .select("id, gem_balance")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Check last spin time
    const { data: lastSpin } = await (supabase.from("daily_spin_history") as any)
      .select("created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate if can spin (24 hours since last spin)
    let canSpin = true;
    let nextSpinTime: string | null = null;

    if (lastSpin) {
      const lastSpinDate = new Date(lastSpin.created_at);
      const now = new Date();
      const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSpin < 24) {
        canSpin = false;
        nextSpinTime = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Get spin history
    const { data: spinHistory } = await (supabase.from("daily_spin_history") as any)
      .select("id, gems_won, spin_result, created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      gemBalance: model.gem_balance || 0,
      canSpin,
      nextSpinTime,
      spinHistory: spinHistory || [],
    });
  } catch (error) {
    console.error("Games status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch game status" },
      { status: 500 }
    );
  }
}
