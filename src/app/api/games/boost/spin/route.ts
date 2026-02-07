import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

// Server-side spin result based on weighted probability
function determineSpinReward(): number {
  const rand = crypto.randomInt(1000); // 0-999
  // Weighted distribution: higher rewards are rarer
  if (rand < 300) return 1;    // 30% chance
  if (rand < 550) return 2;    // 25% chance
  if (rand < 730) return 3;    // 18% chance
  if (rand < 850) return 5;    // 12% chance
  if (rand < 930) return 8;    // 8% chance
  if (rand < 975) return 10;   // 4.5% chance
  if (rand < 995) return 15;   // 2% chance
  return 25;                    // 0.5% chance
}

// POST - Claim daily spin reward
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Must be signed in to claim spin reward" },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Determine reward server-side (ignore any client-provided amount)
    const coins = determineSpinReward();

    // Call the claim_daily_spin function
    const { data: rpcData, error } = await supabase.rpc(
      "claim_daily_spin",
      {
        p_user_id: user.id,
        p_coins: coins,
      }
    );
    const data = rpcData as Record<string, any> | null;

    if (error) {
      console.error("Spin claim error:", error);
      return NextResponse.json(
        { error: "Failed to claim spin reward" },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || "Failed to claim spin reward" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coinsAwarded: data.coins_awarded,
      totalSpinCoins: data.total_spin_coins,
      newBalance: data.new_balance,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json(
      { error: "Failed to process spin" },
      { status: 500 }
    );
  }
}
