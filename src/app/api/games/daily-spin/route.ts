import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Wheel segments with their probabilities (weights)
// Higher weight = more likely to land on
const SPIN_OUTCOMES = [
  { value: 5, weight: 25, label: "5_gems" },
  { value: 10, weight: 22, label: "10_gems" },
  { value: 15, weight: 18, label: "15_gems" },
  { value: 25, weight: 15, label: "25_gems" },
  { value: 50, weight: 10, label: "50_gems" },
  { value: 100, weight: 6, label: "100_gems" },
  { value: 200, weight: 3, label: "200_gems" },
  { value: 500, weight: 1, label: "jackpot" },
];

function getRandomOutcome() {
  const totalWeight = SPIN_OUTCOMES.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;

  for (const outcome of SPIN_OUTCOMES) {
    random -= outcome.weight;
    if (random <= 0) {
      return outcome;
    }
  }

  // Fallback to smallest prize
  return SPIN_OUTCOMES[0];
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model data
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

    // Check last spin time (must be 24+ hours ago)
    const { data: lastSpin } = await (supabase.from("daily_spin_history") as any)
      .select("created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSpin) {
      const lastSpinDate = new Date(lastSpin.created_at);
      const now = new Date();
      const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSpin < 24) {
        const nextSpinTime = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
        return NextResponse.json(
          {
            error: "You can only spin once per day",
            nextSpinTime: nextSpinTime.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Get random outcome
    const outcome = getRandomOutcome();

    // Record the spin
    const { error: historyError } = await (supabase.from("daily_spin_history") as any)
      .insert({
        model_id: model.id,
        gems_won: outcome.value,
        spin_result: outcome.label,
      });

    if (historyError) {
      console.error("Failed to record spin:", historyError);
      return NextResponse.json(
        { error: "Failed to record spin" },
        { status: 500 }
      );
    }

    // Add gems to model balance using the function
    const { data: newBalanceData, error: balanceError } = await supabase
      .rpc("add_gems_to_model", {
        p_model_id: model.id,
        p_gems: outcome.value,
      });

    if (balanceError) {
      console.error("Failed to add gems:", balanceError);
      // Still return success since spin was recorded, but log the issue
    }

    const newBalance = newBalanceData ?? (model.gem_balance || 0) + outcome.value;

    return NextResponse.json({
      gemsWon: outcome.value,
      spinResult: outcome.label,
      newBalance,
    });
  } catch (error) {
    console.error("Daily spin error:", error);
    return NextResponse.json(
      { error: "Failed to spin" },
      { status: 500 }
    );
  }
}
